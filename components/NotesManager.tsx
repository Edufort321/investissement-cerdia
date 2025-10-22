'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Plus, Trash2, Check, X, Edit2, Save, FileText, CheckSquare, Square } from 'lucide-react'

interface Task {
  id: string
  user_id: string
  title: string
  completed: boolean
  created_at: string
  list_id: string
}

interface TodoList {
  id: string
  user_id: string
  name: string
  created_at: string
  tasks: Task[]
}

interface Note {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export default function NotesManager() {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  const [activeView, setActiveView] = useState<'todo' | 'notes'>('todo')

  // Todo Lists State
  const [todoLists, setTodoLists] = useState<TodoList[]>([])
  const [newListName, setNewListName] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [showAddList, setShowAddList] = useState(false)

  // Notes State
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadTodoLists()
      loadNotes()
    }
  }, [currentUser])

  // Todo Lists Functions
  const loadTodoLists = async () => {
    try {
      const { data: lists, error: listsError } = await supabase
        .from('todo_lists')
        .select('*')
        .eq('user_id', currentUser?.id)
        .order('created_at', { ascending: false })

      if (listsError) throw listsError

      const listsWithTasks = await Promise.all(
        (lists || []).map(async (list) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('list_id', list.id)
            .order('created_at', { ascending: true })

          if (tasksError) throw tasksError

          return { ...list, tasks: tasks || [] }
        })
      )

      setTodoLists(listsWithTasks)
      if (listsWithTasks.length > 0 && !selectedListId) {
        setSelectedListId(listsWithTasks[0].id)
      }
    } catch (error: any) {
      console.error('Error loading todo lists:', error.message)
    }
  }

  const createTodoList = async () => {
    if (!newListName.trim()) return

    try {
      const { data, error } = await supabase
        .from('todo_lists')
        .insert([{ user_id: currentUser?.id, name: newListName }])
        .select()
        .single()

      if (error) throw error

      setTodoLists([{ ...data, tasks: [] }, ...todoLists])
      setSelectedListId(data.id)
      setNewListName('')
      setShowAddList(false)
    } catch (error: any) {
      console.error('Error creating list:', error.message)
    }
  }

  const deleteTodoList = async (listId: string) => {
    if (!confirm(t('notes.confirmDeleteList'))) return

    try {
      const { error } = await supabase.from('todo_lists').delete().eq('id', listId)
      if (error) throw error

      setTodoLists(todoLists.filter(l => l.id !== listId))
      if (selectedListId === listId) {
        setSelectedListId(todoLists[0]?.id || null)
      }
    } catch (error: any) {
      console.error('Error deleting list:', error.message)
    }
  }

  const addTask = async (listId: string) => {
    if (!newTaskTitle.trim()) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: currentUser?.id,
          list_id: listId,
          title: newTaskTitle,
          completed: false
        }])
        .select()
        .single()

      if (error) throw error

      setTodoLists(todoLists.map(list =>
        list.id === listId
          ? { ...list, tasks: [...list.tasks, data] }
          : list
      ))
      setNewTaskTitle('')
    } catch (error: any) {
      console.error('Error adding task:', error.message)
    }
  }

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', taskId)

      if (error) throw error

      setTodoLists(todoLists.map(list => ({
        ...list,
        tasks: list.tasks.map(task =>
          task.id === taskId ? { ...task, completed: !completed } : task
        )
      })))
    } catch (error: any) {
      console.error('Error toggling task:', error.message)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error

      setTodoLists(todoLists.map(list => ({
        ...list,
        tasks: list.tasks.filter(task => task.id !== taskId)
      })))
    } catch (error: any) {
      console.error('Error deleting task:', error.message)
    }
  }

  // Notes Functions
  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser?.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error: any) {
      console.error('Error loading notes:', error.message)
    }
  }

  const createOrUpdateNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return

    try {
      if (selectedNote) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: noteTitle,
            content: noteContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNote.id)

        if (error) throw error

        setNotes(notes.map(n =>
          n.id === selectedNote.id
            ? { ...n, title: noteTitle, content: noteContent, updated_at: new Date().toISOString() }
            : n
        ))
      } else {
        // Create new note
        const { data, error } = await supabase
          .from('notes')
          .insert([{
            user_id: currentUser?.id,
            title: noteTitle,
            content: noteContent
          }])
          .select()
          .single()

        if (error) throw error
        setNotes([data, ...notes])
      }

      setNoteTitle('')
      setNoteContent('')
      setSelectedNote(null)
      setIsEditingNote(false)
    } catch (error: any) {
      console.error('Error saving note:', error.message)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm(t('notes.confirmDeleteNote'))) return

    try {
      const { error } = await supabase.from('notes').delete().eq('id', noteId)
      if (error) throw error

      setNotes(notes.filter(n => n.id !== noteId))
      if (selectedNote?.id === noteId) {
        setSelectedNote(null)
      }
    } catch (error: any) {
      console.error('Error deleting note:', error.message)
    }
  }

  const selectedList = todoLists.find(l => l.id === selectedListId)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <ClipboardList className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('notes.title')}</h1>
            <p className="text-gray-600">{t('userGuide.todoListsDesc')}</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveView('todo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'todo'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckSquare size={18} />
              {t('notes.todoLists')}
            </div>
          </button>
          <button
            onClick={() => setActiveView('notes')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'notes'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              {t('notes.notes')}
            </div>
          </button>
        </div>
      </div>

      {/* Todo Lists View */}
      {activeView === 'todo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lists Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('notes.todoLists')}</h2>
                <button
                  onClick={() => setShowAddList(true)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              {showAddList && (
                <div className="mb-4 space-y-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder={t('notes.listNamePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && createTodoList()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createTodoList}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Check size={16} className="inline mr-1" />
                      {t('notes.createList')}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddList(false)
                        setNewListName('')
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {todoLists.map((list) => (
                  <div
                    key={list.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedListId === list.id
                        ? 'bg-purple-50 border-2 border-purple-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{list.name}</h3>
                      <p className="text-sm text-gray-500">
                        {list.tasks.filter(t => !t.completed).length} / {list.tasks.length} {t('notes.tasksCompleted')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTodoList(list.id)
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {todoLists.length === 0 && !showAddList && (
                <p className="text-center text-gray-500 py-8">
                  {t('notes.noLists')}
                </p>
              )}
            </div>
          </div>

          {/* Tasks Panel */}
          <div className="lg:col-span-2">
            {selectedList ? (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedList.name}</h2>

                {/* Add Task */}
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={t('notes.taskPlaceholder')}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && addTask(selectedList.id)}
                  />
                  <button
                    onClick={() => addTask(selectedList.id)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} />
                    {t('notes.add')}
                  </button>
                </div>

                {/* Tasks List */}
                <div className="space-y-2">
                  {selectedList.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <button
                        onClick={() => toggleTask(task.id, task.completed)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckSquare className="text-purple-600" size={24} />
                        ) : (
                          <Square className="text-gray-400" size={24} />
                        )}
                      </button>
                      <span
                        className={`flex-1 ${
                          task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {selectedList.tasks.length === 0 && (
                  <p className="text-center text-gray-500 py-12">
                    {t('notes.createFirstList')}
                  </p>
                )}

                {/* Progress */}
                {selectedList.tasks.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('dashboard.progress')}</span>
                      <span className="text-sm text-gray-600">
                        {selectedList.tasks.filter(t => t.completed).length} / {selectedList.tasks.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(selectedList.tasks.filter(t => t.completed).length / selectedList.tasks.length) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
                <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">{t('notes.createFirstList')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes View */}
      {activeView === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{t('notes.notes')}</h2>
                <button
                  onClick={() => {
                    setIsEditingNote(true)
                    setSelectedNote(null)
                    setNoteTitle('')
                    setNoteContent('')
                  }}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNote?.id === note.id
                        ? 'bg-purple-50 border-2 border-purple-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedNote(note)
                      setNoteTitle(note.title)
                      setNoteContent(note.content)
                      setIsEditingNote(false)
                    }}
                  >
                    <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(note.updated_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>

              {notes.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  {t('notes.noNotes')}
                </p>
              )}
            </div>
          </div>

          {/* Note Editor */}
          <div className="lg:col-span-2">
            {(selectedNote || isEditingNote) ? (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="space-y-4">
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder={t('notes.noteTitlePlaceholder')}
                    className="w-full px-4 py-3 text-xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={t('notes.noteContentPlaceholder')}
                    rows={15}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createOrUpdateNote}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Save size={20} />
                      {t('notes.save')}
                    </button>
                    {selectedNote && (
                      <button
                        onClick={() => deleteNote(selectedNote.id)}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <Trash2 size={20} />
                        {t('notes.delete')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">{t('notes.createFirstNote')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
