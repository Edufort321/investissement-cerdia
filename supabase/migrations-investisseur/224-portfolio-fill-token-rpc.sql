-- =====================================================================
-- 224 — Portfolio artiste : accès par lien de remplissage via RPC (ÉTAPE 1/2, additive)
-- =====================================================================
-- CONTEXTE : la page anonyme /portfolio/fill/[token] écrivait directement dans les
-- tables avec des policies anon trop larges (mig.174/183/210) :
--   • portfolio_profiles : UPDATE anon sur TOUTE ligne ayant un fill_token (= toutes)
--   • portfolio_items    : FOR ALL TO anon, authenticated USING (true) → n'importe qui
--                          (anonyme ou n'importe quel utilisateur connecté) modifie/supprime
--                          les photos de tous les artistes
--   • storage « portfolio » : INSERT/UPDATE anon partout → écrasement de fichiers d'autrui
-- CORRECTIF : toutes les opérations du lien passent par des fonctions SECURITY DEFINER
-- qui exigent le fill_token EXACT du profil. Cette migration est ADDITIVE : rien n'est
-- retiré ici, la page actuelle continue de fonctionner. Le verrouillage est en 225,
-- à appliquer APRÈS le déploiement du code qui utilise ces RPC.
-- Idempotent.
-- =====================================================================

-- Droit de gérer les portfolios depuis l'admin (onglet Artiste) : utilisé par 225 (storage).
create or replace function public.can_manage_portfolio()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role in ('super_admin', 'org_admin', 'org_commerce')
  );
$$;

-- Profil + items à partir du jeton (lecture du lien de remplissage)
create or replace function public.portfolio_fill_get(p_token uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare pid uuid; result json;
begin
  select id into pid from public.portfolio_profiles where fill_token = p_token;
  if pid is null then return null; end if;
  select json_build_object(
    'profile', (select to_jsonb(p) - 'organization_id' from public.portfolio_profiles p where p.id = pid),
    'items',   coalesce((select json_agg(i order by i.sort_order, i.created_at)
                           from public.portfolio_items i where i.profile_id = pid), '[]'::json)
  ) into result;
  return result;
end; $$;

-- Mise à jour des champs éditables par l'artiste (liste blanche — jamais slug/fill_token/org/facturation)
create or replace function public.portfolio_fill_update(p_token uuid, p_patch jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from public.portfolio_profiles where fill_token = p_token;
  if pid is null then raise exception 'INVALID_TOKEN' using errcode = '28000'; end if;

  update public.portfolio_profiles set
    name           = case when p_patch ? 'name'           then coalesce(p_patch->>'name', '')           else name end,
    tagline        = case when p_patch ? 'tagline'        then p_patch->>'tagline'        else tagline end,
    bio            = case when p_patch ? 'bio'            then p_patch->>'bio'            else bio end,
    contact_email  = case when p_patch ? 'contact_email'  then p_patch->>'contact_email'  else contact_email end,
    phone          = case when p_patch ? 'phone'          then p_patch->>'phone'          else phone end,
    instagram_url  = case when p_patch ? 'instagram_url'  then p_patch->>'instagram_url'  else instagram_url end,
    tiktok_url     = case when p_patch ? 'tiktok_url'     then p_patch->>'tiktok_url'     else tiktok_url end,
    location       = case when p_patch ? 'location'       then p_patch->>'location'       else location end,
    uda_number     = case when p_patch ? 'uda_number'     then p_patch->>'uda_number'     else uda_number end,
    gender         = case when p_patch ? 'gender'         then p_patch->>'gender'         else gender end,
    age_class      = case when p_patch ? 'age_class'      then p_patch->>'age_class'      else age_class end,
    theme          = case when p_patch ? 'theme'          then p_patch->>'theme'          else theme end,
    theme_primary  = case when p_patch ? 'theme_primary'  then p_patch->>'theme_primary'  else theme_primary end,
    theme_accent   = case when p_patch ? 'theme_accent'   then p_patch->>'theme_accent'   else theme_accent end,
    height_cm      = case when p_patch ? 'height_cm'      then nullif(p_patch->>'height_cm', '')::integer      else height_cm end,
    weight_kg      = case when p_patch ? 'weight_kg'      then nullif(p_patch->>'weight_kg', '')::numeric(4,1) else weight_kg end,
    eye_color      = case when p_patch ? 'eye_color'      then p_patch->>'eye_color'      else eye_color end,
    hair_color     = case when p_patch ? 'hair_color'     then p_patch->>'hair_color'     else hair_color end,
    hair_length    = case when p_patch ? 'hair_length'    then p_patch->>'hair_length'    else hair_length end,
    skin_tone      = case when p_patch ? 'skin_tone'      then p_patch->>'skin_tone'      else skin_tone end,
    shoe_size      = case when p_patch ? 'shoe_size'      then p_patch->>'shoe_size'      else shoe_size end,
    clothing_size  = case when p_patch ? 'clothing_size'  then p_patch->>'clothing_size'  else clothing_size end,
    languages      = case when p_patch ? 'languages'
                          then coalesce(array(select jsonb_array_elements_text(p_patch->'languages')), '{}')
                          else languages end,
    special_skills = case when p_patch ? 'special_skills' then p_patch->>'special_skills' else special_skills end,
    headshot_url   = case when p_patch ? 'headshot_url'   then p_patch->>'headshot_url'   else headshot_url end,
    cover_url      = case when p_patch ? 'cover_url'      then p_patch->>'cover_url'      else cover_url end,
    is_published   = case when p_patch ? 'is_published'   then coalesce((p_patch->>'is_published')::boolean, is_published) else is_published end
  where id = pid;
end; $$;

-- Items (photo / vidéo / lien / service)
create or replace function public.portfolio_fill_add_item(
  p_token uuid, p_type text, p_url text, p_title text default null,
  p_thumbnail_url text default null, p_category text default 'portfolio')
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid; new_id uuid; next_order int;
begin
  select id into pid from public.portfolio_profiles where fill_token = p_token;
  if pid is null then raise exception 'INVALID_TOKEN' using errcode = '28000'; end if;
  if p_type not in ('photo', 'video', 'link', 'service') then raise exception 'INVALID_TYPE'; end if;
  select coalesce(max(sort_order), 0) + 1 into next_order from public.portfolio_items where profile_id = pid;
  insert into public.portfolio_items (profile_id, type, url, title, thumbnail_url, category, sort_order)
  values (pid, p_type, p_url, p_title, coalesce(p_thumbnail_url, ''), coalesce(p_category, 'portfolio'), next_order)
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.portfolio_fill_update_item(p_token uuid, p_item_id uuid, p_url text, p_thumbnail_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.portfolio_items i set url = p_url, thumbnail_url = p_thumbnail_url
   from public.portfolio_profiles p
  where i.id = p_item_id and i.profile_id = p.id and p.fill_token = p_token;
  if not found then raise exception 'INVALID_TOKEN' using errcode = '28000'; end if;
end; $$;

create or replace function public.portfolio_fill_delete_item(p_token uuid, p_item_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.portfolio_items i
   using public.portfolio_profiles p
  where i.id = p_item_id and i.profile_id = p.id and p.fill_token = p_token;
  if not found then raise exception 'INVALID_TOKEN' using errcode = '28000'; end if;
end; $$;

-- La contrainte d'origine (mig.174) refuse type='service' et les tarifs dans category : on l'aligne sur l'usage réel.
alter table public.portfolio_items drop constraint if exists portfolio_items_type_check;
alter table public.portfolio_items add constraint portfolio_items_type_check
  check (type in ('photo', 'link', 'video', 'service'));
alter table public.portfolio_items drop constraint if exists portfolio_items_category_check;
alter table public.portfolio_items alter column url drop not null;

grant execute on function public.portfolio_fill_get(uuid)                                    to anon, authenticated;
grant execute on function public.portfolio_fill_update(uuid, jsonb)                          to anon, authenticated;
grant execute on function public.portfolio_fill_add_item(uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.portfolio_fill_update_item(uuid, uuid, text, text)          to anon, authenticated;
grant execute on function public.portfolio_fill_delete_item(uuid, uuid)                      to anon, authenticated;
grant execute on function public.can_manage_portfolio()                                      to authenticated;

insert into schema_migrations (version) values ('224') on conflict (version) do nothing;
