'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'

type Transaction = {
  id: string
  type: string
  amount: number
  member: string
  currency: string
}

type Profile = {
  role: string
  display_name: string
}

export default function HomePage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [monthlyBudget, setMonthlyBudget] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Pick the correct budget row depending on who's logged in
      const budgetKey =
        profileData?.role === 'Father' ? 'father_drinks' : 'shared_monthly'

      const { data: budgetData } = await supabase
        .from('budgets')
        .select('amount')
        .eq('key', budgetKey)
        .single()

      if (budgetData) {
        setMonthlyBudget(Number(budgetData.amount))
      }

      const { data: txData, error } = await supabase
        .from('transactions')
        .select('id, type, amount, member, currency')

      if (!error && txData) {
        setTransactions(txData)
      }
      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel('transactions-changes')
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

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const isFather = profile.role === 'Father'

  const relevantTransactions = isFather
    ? transactions.filter((t) => t.member === 'Father')
    : transactions.filter((t) => t.member !== 'Father')

  // New logic: start from the Monthly Budget, subtract expenses, add back income/returns
  const netChange = relevantTransactions.reduce((total, t) => {
    if (t.type === 'Income') return total + Number(t.amount)
    if (t.type === 'Expense') return total - Number(t.amount)
    return total
  }, 0)

  const remainingBalance = monthlyBudget + netChange

  const currencyLabel = isFather ? 'THB' : 'LKR'
  const budgetLabel = isFather ? "Father's Drink Budget" : 'Monthly Budget'
  const balanceLabel = isFather ? 'Remaining (Drinks)' : 'Remaining Balance'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Top bar */}
      <div className="bg-blue-600 dark:bg-blue-800 text-white px-5 pt-6 pb-16 rounded-b-3xl shadow-md transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9 text-white shrink-0" />
            <div>
              <p className="text-blue-100 text-sm">Welcome back</p>
              <h1 className="text-xl font-bold">{profile.display_name}&apos;s Page</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full font-medium hover:bg-white/30 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content area, pulled up to overlap the top bar */}
      <div className="px-5 -mt-10 pb-8 max-w-md mx-auto">
        {/* Budget + Balance cards, stacked, matching Admin Panel button style */}
        <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl py-5 px-4 text-center shadow-sm mb-3 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
            {budgetLabel}
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {currencyLabel} {monthlyBudget.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 rounded-xl py-5 px-4 text-center shadow-sm mb-6 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
            {balanceLabel}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              remainingBalance < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            {currencyLabel} {remainingBalance.toLocaleString()}
          </p>
        </div>

        {/* Action buttons — all full width, uniform style */}
        
        <a  href="/transactions/new"
          className="block bg-blue-600 text-white rounded-xl py-4 px-4 font-semibold text-center text-lg shadow hover:bg-blue-700 transition mb-3"
        >
          + New Transaction
        </a>

        
        <a  href="/history"
          className="block bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 rounded-xl py-4 px-4 font-semibold text-center text-lg shadow-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition mb-3"
        >
          History
        </a>

        {profile.role === 'Admin' && (
          
          <a  href="/admin"
            className="block bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 rounded-xl py-4 px-4 font-semibold text-center text-lg shadow-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition"
          >
            Admin Panel
          </a>
        )}
      </div>
    </div>
  )
}