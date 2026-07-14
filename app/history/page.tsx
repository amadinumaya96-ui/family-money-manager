'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Transaction = {
  id: string
  member: string
  type: string
  category: string
  amount: number
  currency: string
  transaction_date: string
  description: string | null
}

type CategoryLimit = {
  category: string
  limit_amount: number
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    fetchData()

    const supabase = createClient()
    const channel = supabase
      .channel('history-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchData() {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileData?.role === 'Admin') {
      setIsAdmin(true)
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (!error && data) {
      setTransactions(data)
    }

    const { data: limitData } = await supabase
      .from('category_limits')
      .select('category, limit_amount')
      .gt('limit_amount', 0)

    if (limitData) {
      setCategoryLimits(limitData)
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction?'
    )
    if (!confirmed) return

    const supabase = createClient()
    await supabase.from('transactions').delete().eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const spendingByCategory: Record<string, number> = {}
  transactions.forEach((t) => {
    if (t.type !== 'Expense') return
    spendingByCategory[t.category] =
      (spendingByCategory[t.category] || 0) + Number(t.amount)
  })

  const alerts = categoryLimits
    .map((limit) => ({
      ...limit,
      spent: spendingByCategory[limit.category] || 0,
    }))
    .filter((limit) => limit.spent > limit.limit_amount)

  const allCategories = Array.from(
    new Set(transactions.map((t) => t.category))
  )

  const filteredTransactions = transactions.filter((t) => {
    const matchesCategory =
      categoryFilter === 'All' || t.category === categoryFilter
    const matchesSearch =
      searchTerm === '' ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.member.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="bg-blue-600 dark:bg-blue-800 px-5 pt-6 pb-8 rounded-b-3xl shadow-md flex justify-between items-center transition-colors">
        <h1 className="text-xl font-bold text-white">Transaction History</h1>
        
        <a  href="/"
          className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full font-medium hover:bg-white/30 transition"
        >
          Home
        </a>
      </div>

      <div className="px-5 -mt-4 pb-8 max-w-xl mx-auto">
        {alerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-4 shadow-sm">
            <p className="text-red-700 dark:text-red-400 font-semibold mb-2 text-sm">
              ⚠ Categories over their limit
            </p>
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a.category} className="text-red-600 dark:text-red-400 text-sm">
                  {a.category}: spent {a.spent.toLocaleString()} / limit{' '}
                  {a.limit_amount.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by description, category, member..."
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white shadow-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white shadow-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All categories</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Transaction cards */}
        <div className="space-y-3">
          {filteredTransactions.map((t) => {
            const isExpense = t.type === 'Expense'
            return (
              <div
                key={t.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-4 transition-colors"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 ${
                    isExpense
                      ? 'bg-red-100 dark:bg-red-950 text-red-500 dark:text-red-400'
                      : 'bg-green-100 dark:bg-green-950 text-green-500 dark:text-green-400'
                  }`}
                >
                  {isExpense ? '↓' : '↑'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {t.description || t.category}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    {t.category} · {t.member}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {t.transaction_date}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`font-bold ${
                      isExpense
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-green-500 dark:text-green-400'
                    }`}
                  >
                    {isExpense ? '-' : '+'} {t.currency}{' '}
                    {Number(t.amount).toLocaleString()}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 text-xs font-medium mt-1"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredTransactions.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">
            No transactions found.
          </p>
        )}
      </div>
    </div>
  )
}