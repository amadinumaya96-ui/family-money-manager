'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type CategoryLimit = {
  id: string
  category: string
  limit_amount: number
}

type Category = {
  id: string
  name: string
  father_only: boolean
}

export default function CategoryLimitsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [limits, setLimits] = useState<Record<string, string>>({})
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

    const categoryList = categoryData || []
    setCategories(categoryList)

    const { data: limitData } = await supabase
      .from('category_limits')
      .select('id, category, limit_amount')

    const limitMap: Record<string, string> = {}
    categoryList.forEach((cat) => {
      const existing = (limitData as CategoryLimit[] | null)?.find(
        (l) => l.category === cat.name
      )
      limitMap[cat.name] = existing ? String(existing.limit_amount) : ''
    })
    setLimits(limitMap)

    setLoading(false)
  }

  async function handleSaveLimits() {
    setSaving(true)
    setMessage('')
    const supabase = createClient()

    for (const cat of categories) {
      const value = limits[cat.name]
      if (value === '' || value === undefined) continue

      await supabase.from('category_limits').upsert(
        {
          category: cat.name,
          limit_amount: Number(value),
        },
        { onConflict: 'category' }
      )
    }

    setSaving(false)
    setMessage('Category limits saved!')
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
        <h1 className="text-xl font-bold text-white">Set Category Limits</h1>

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
            Leave blank for no limit on a category.
          </p>

          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <label className="w-36 text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
                  {cat.name}
                </label>
                <input
                  type="number"
                  value={limits[cat.name] || ''}
                  onChange={(e) =>
                    setLimits((prev) => ({ ...prev, [cat.name]: e.target.value }))
                  }
                  className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No limit"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveLimits}
            disabled={saving}
            className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Category Limits'}
          </button>
        </div>
      </div>
    </div>
  )
}