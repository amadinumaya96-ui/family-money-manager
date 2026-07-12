'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Transaction = {
  id: string
  type: string
  amount: number
}

type Profile = {
  role: string
  display_name: string
}

export default function HomePage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
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

      const { data: txData, error } = await supabase
        .from('transactions')
        .select('id, type, amount')

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

  const remainingBalance = transactions.reduce((total, t) => {
    if (t.type === 'Income') return total + Number(t.amount)
    if (t.type === 'Expense') return total - Number(t.amount)
    return total
  }, 0)

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {profile?.display_name}'s Page
        </h1>
        <button
          onClick={handleLogout}
          className="bg-gray-200 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
        >
          Logout
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-sm mb-6">
        <p className="text-gray-500 text-sm">Remaining Balance</p>
        <p className="text-3xl font-bold text-green-600">
          LKR {remainingBalance.toLocaleString()}
        </p>
      </div>

      <div className="flex gap-3">
        
        <a  href="/transactions/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          New Transaction
        </a>
        
        <a  href="/history"
          className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
        >
          History
        </a>
      </div>
    </div>
  )
}