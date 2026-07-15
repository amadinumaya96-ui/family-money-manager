'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Category = {
  id: string
  name: string
  father_only: boolean
}

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryFatherOnly, setNewCategoryFatherOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    const { data: categoryData } = await supabase
      .from('categories')
      .select('id, name, father_only')
      .order('name', { ascending: true })

    setCategories(categoryData || [])
    setLoading(false)
  }

  async function handleAddCategory() {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return

    setSaving(true)
    setMessage('')
    const supabase = createClient()

    const { error } = await supabase.from('categories').insert({
      name: trimmedName,
      father_only: newCategoryFatherOnly,
    })

    setSaving(false)

    if (error) {
      setMessage(`Could not add category: ${error.message}`)
      return
    }

    setNewCategoryName('')
    setNewCategoryFatherOnly(false)
    setMessage('Category added!')
    fetchData()
  }

  async function handleDeleteCategory(id: string, name: string) {
    const confirmed = window.confirm(
      `Delete the "${name}" category? Existing transactions with this category will keep it as text, but it will no longer appear as an option.`
    )
    if (!confirmed) return

    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', id)
    fetchData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="bg-blue-600 dark:bg-blue-800 px-5 pt-6 pb-8 rounded-b-3xl shadow-md flex justify-between items-center transition-colors">
        <h1 className="text-xl font-bold text-white">Manage Categories</h1>

        <Link
          href="/admin"
          className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full font-medium hover:bg-white/30 transition"
        >
          Back
        </Link>
      </div>

      <div className="px-5 -mt-4 pb-8 max-w-2xl mx-auto">
        {message && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-2xl p-3 mb-4 text-sm font-medium shadow-sm">
            {message}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Add new categories or remove ones you no longer need.
          </p>

          <div className="flex flex-col gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={newCategoryFatherOnly}
                onChange={(e) => setNewCategoryFatherOnly(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              Father-only category
            </label>
            <button
              onClick={handleAddCategory}
              disabled={saving || !newCategoryName.trim()}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              Add Category
            </button>
          </div>

          <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {cat.name}
                  {cat.father_only && (
                    <span className="ml-2 text-xs text-blue-500 dark:text-blue-400 font-medium">
                      (Father only)
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            ))}

            {categories.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No categories yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}