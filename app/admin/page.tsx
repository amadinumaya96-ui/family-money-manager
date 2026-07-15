'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'


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

export default function AdminPanelPage() {
  const [sharedBudget, setSharedBudget] = useState('')
  const [fatherBudget, setFatherBudget] = useState('')
  const [limits, setLimits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryFatherOnly, setNewCategoryFatherOnly] = useState(false)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterMember, setFilterMember] = useState('All')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [monthlyStats, setMonthlyStats] = useState({
    total: 0,
    expenses: 0,
    income: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const supabase = createClient()

    const { data: budgetData } = await supabase
      .from('budgets')
      .select('key, amount')

    if (budgetData) {
      const shared = budgetData.find((b) => b.key === 'shared_monthly')
      const father = budgetData.find((b) => b.key === 'father_drinks')
      setSharedBudget(shared ? String(shared.amount) : '0')
      setFatherBudget(father ? String(father.amount) : '0')
    }

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

    // Work out the start and end of the current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10)

    const { data: monthTransactions } = await supabase
      .from('transactions')
      .select('type')
      .gte('transaction_date', monthStart)
      .lte('transaction_date', monthEnd)

    if (monthTransactions) {
      const expenseCount = monthTransactions.filter(
        (t) => t.type === 'Expense'
      ).length
      const incomeCount = monthTransactions.filter(
        (t) => t.type === 'Income'
      ).length

      setMonthlyStats({
        total: monthTransactions.length,
        expenses: expenseCount,
        income: incomeCount,
      })
    }

    setLoading(false)
  }

  async function handleSaveBudgets() {
    setSaving(true)
    setMessage('')
    const supabase = createClient()

    await supabase
      .from('budgets')
      .update({ amount: Number(sharedBudget) })
      .eq('key', 'shared_monthly')

    await supabase
      .from('budgets')
      .update({ amount: Number(fatherBudget) })
      .eq('key', 'father_drinks')

    setSaving(false)
    setMessage('Budgets saved!')
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
  
  async function handleDownloadPDF() {
    setSaving(true)
    setMessage('')
    const supabase = createClient()

    let query = supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (filterCategory !== 'All') {
      query = query.eq('category', filterCategory)
    }
    if (filterMember !== 'All') {
      query = query.eq('member', filterMember)
    }
    if (filterStartDate) {
      query = query.gte('transaction_date', filterStartDate)
    }
    if (filterEndDate) {
      query = query.lte('transaction_date', filterEndDate)
    }

    const { data: transactions, error } = await query

    setSaving(false)

    if (error || !transactions) {
      setMessage('Could not load transactions for export.')
      return
    }

    if (transactions.length === 0) {
      setMessage('No transactions match those filters.')
      return
    }

    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Family Money Management', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      21
    )

    const tableRows = transactions.map((t) => [
      t.transaction_date,
      t.member,
      t.type,
      t.category,
      `${t.currency} ${Number(t.amount).toLocaleString()}`,
      t.description || '-',
    ])

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Member', 'Type', 'Category', 'Amount', 'Description']],
      body: tableRows,
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    })

    doc.save(`transactions-${new Date().toISOString().slice(0, 10)}.pdf`)
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

  async function handleDeleteAllData() {
    const confirmed = window.confirm(
      'This will permanently delete ALL transactions. This cannot be undone. Are you sure?'
    )
    if (!confirmed) return

    const doubleConfirmed = window.confirm(
      'Are you REALLY sure? This will erase everything to start a new month.'
    )
    if (!doubleConfirmed) return

    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    setSaving(false)
    setMessage('All transaction data has been deleted.')
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
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        
        <a  href="/"
          className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full font-medium hover:bg-white/30 transition"
        >
          Home
        </a>
      </div>

      <div className="px-5 -mt-4 pb-8 max-w-2xl mx-auto">
        {message && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-2xl p-3 mb-4 text-sm font-medium shadow-sm">
            {message}
          </div>
        )}

        {/* Monthly Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl py-4 px-2 text-center shadow-sm transition-colors">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {monthlyStats.total}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-semibold mt-1">
              This Month
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl py-4 px-2 text-center shadow-sm transition-colors">
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">
              {monthlyStats.expenses}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-semibold mt-1">
              Expenses
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl py-4 px-2 text-center shadow-sm transition-colors">
            <p className="text-2xl font-bold text-green-500 dark:text-green-400">
              {monthlyStats.income}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-semibold mt-1">
              Income
            </p>
          </div>
        </div>

        {/* Monthly Budgets */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Set Monthly Budget
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Shared Budget (Mother/Brother/Admin) — LKR
            </label>
            <input
              type="number"
              value={sharedBudget}
              onChange={(e) => setSharedBudget(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              Father&apos;s Drink Budget — THB
            </label>
            <input
              type="number"
              value={fatherBudget}
              onChange={(e) => setFatherBudget(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSaveBudgets}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Budgets'}
          </button>
        </div>

        {/* Category Limits */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Set Category Limits
          </h2>
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

        {/* Manage Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Manage Categories
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Add new categories or remove ones you no longer need.
          </p>

          {/* Add new category */}
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

          {/* Existing categories list */}
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

        {/* Export */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Export Records
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Choose filters, or leave them as &quot;All&quot; to export everything.
          </p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Member
              </label>
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All members</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Preparing...' : 'Download PDF'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-red-200 dark:border-red-900 transition-colors">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Use this at the end of the month to clear all transactions and
            start fresh. This cannot be undone.
          </p>
          <button
            onClick={handleDeleteAllData}
            disabled={saving}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow hover:bg-red-700 transition disabled:opacity-50"
          >
            {saving ? 'Deleting...' : 'Delete All Transaction Data'}
          </button>
        </div>
      </div>
    </div>
  )
}