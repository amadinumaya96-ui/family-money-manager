'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'


export default function AdminPanelPage() {
  const [sharedBudget, setSharedBudget] = useState('')
  const [fatherBudget, setFatherBudget] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
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

        {/* Manage */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Manage
          </h2>

          <div className="space-y-3">
            <Link
              href="/admin/category-limits"
              className="block bg-blue-600 text-white py-2.5 px-5 rounded-xl font-semibold text-center shadow hover:bg-blue-700 transition"
            >
              Set Category Limits
            </Link>

            <Link
              href="/admin/categories"
              className="block bg-blue-600 text-white py-2.5 px-5 rounded-xl font-semibold text-center shadow hover:bg-blue-700 transition"
            >
              Manage Categories
            </Link>

            <Link
              href="/admin/export"
              className="block bg-blue-600 text-white py-2.5 px-5 rounded-xl font-semibold text-center shadow hover:bg-blue-700 transition"
            >
              Export Records
            </Link>
          </div>
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