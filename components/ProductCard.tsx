import React from "react";

interface Product {
  id: string;
  title: string;
  price: string;
  amazonShort: string;
  amazonLong?: string;
  tiktokLink?: string;
  images: string[];
}

interface Props {
  product: Product;
  onDelete: () => void;
}

export default function ProductCard({ product, onDelete }: Props) {
  const validImages = product.images.filter((url) =>
    url && (url.endsWith(".jpg") || url.endsWith(".png") || url.includes("amazon"))
  );

  return (
    <div className="border p-4 rounded shadow mb-4 bg-white text-center">
      <button className="float-right text-red-500" onClick={onDelete}>✖</button>
      {validImages.length > 0 && (
        <img
          src={validImages[0]}
          alt={product.title}
          className="mx-auto mb-2 w-32 h-32 object-contain"
        />
      )}
      <h2 className="font-bold text-sm">{product.title}</h2>
      <p>{product.price}</p>
      <a href={product.amazonShort} target="_blank" rel="noopener noreferrer">
        <button className="bg-blue-600 text-white px-2 py-1 text-sm mt-2 rounded">Amazon</button>
      </a>
      {product.tiktokLink && (
        <div className="mt-1">
          <a href={product.tiktokLink} className="text-blue-500 text-xs" target="_blank">Voir sur TikTok</a>
        </div>
      )}
    </div>
  );
}
