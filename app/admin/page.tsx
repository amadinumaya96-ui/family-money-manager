'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const CATEGORIES = [
  'Groceries',
  'Salary for workers',
  'Junk food',
  'Electricity bill',
  'Water bill',
  'Internet bill',
  'Travel',
  'For Drinks',
  'Petrol',
  'Earns',
  'Other',
]

type CategoryLimit = {
  id: string
  category: string
  limit_amount: number
}

export default function AdminPanelPage() {
  const [sharedBudget, setSharedBudget] = useState('')
  const [fatherBudget, setFatherBudget] = useState('')
  const [limits, setLimits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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

    const { data: limitData } = await supabase
      .from('category_limits')
      .select('id, category, limit_amount')

    const limitMap: Record<string, string> = {}
    CATEGORIES.forEach((cat) => {
      const existing = (limitData as CategoryLimit[] | null)?.find(
        (l) => l.category === cat
      )
      limitMap[cat] = existing ? String(existing.limit_amount) : ''
    })
    setLimits(limitMap)

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

    for (const cat of CATEGORIES) {
      const value = limits[cat]
      if (value === '' || value === undefined) continue

      await supabase.from('category_limits').upsert(
        {
          category: cat,
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

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    setSaving(false)

    if (error || !transactions) {
      setMessage('Could not load transactions for export.')
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
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <label className="w-36 text-sm font-medium text-gray-600 dark:text-gray-300 shrink-0">
                  {cat}
                </label>
                <input
                  type="number"
                  value={limits[cat] || ''}
                  onChange={(e) =>
                    setLimits((prev) => ({ ...prev, [cat]: e.target.value }))
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
        
        {/* Export */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Export Records
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Download all transaction history as a PDF file.
          </p>
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