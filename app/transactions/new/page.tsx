'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Category = {
  id: string
  name: string
  father_only: boolean
}

export default function NewTransactionPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [type, setType] = useState<'Expense' | 'Income'>('Expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function fetchInitialData() {
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

      const userRole = profileData?.role || null
      setRole(userRole)

      const { data: categoryData } = await supabase
        .from('categories')
        .select('id, name, father_only')
        .order('name', { ascending: true })

      const allCategories = categoryData || []

      const filtered =
        userRole === 'Father'
          ? allCategories.filter((c) => c.father_only)
          : allCategories.filter((c) => !c.father_only)

      setAvailableCategories(filtered)
      if (filtered.length > 0) {
        setCategory(filtered[0].name)
      }

      setLoading(false)
    }

    fetchInitialData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!amount || !date) {
      setErrorMsg('Please fill in amount and date.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setErrorMsg('You must be logged in.')
      setSaving(false)
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const memberRole = profileData?.role || 'Mother'
    const currencyToUse = memberRole === 'Father' ? 'THB' : 'LKR'

    const { error } = await supabase.from('transactions').insert({
      member: memberRole,
      type: type,
      category: category,
      amount: Number(amount),
      currency: currencyToUse,
      transaction_date: date,
      description: description,
    })

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    router.push('/')
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
        <h1 className="text-xl font-bold text-white">New Transaction</h1>
        
        <a  href="/"
          className="bg-white/20 text-white text-sm px-3 py-1.5 rounded-full font-medium hover:bg-white/30 transition"
        >
          Home
        </a>
      </div>

      <div className="px-5 -mt-4 pb-8 max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setType('Expense')}
              className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                type === 'Expense'
                  ? 'bg-red-500 text-white shadow'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
              }`}
            >
              <span className="text-2xl leading-none">−</span>
              
            </button>
            <button
              type="button"
              onClick={() => setType('Income')}
              className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                type === 'Income'
                  ? 'bg-green-500 text-white shadow'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
              }`}
            >
              <span className="text-2xl leading-none">+</span>
              
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional note"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {errorMsg && (
              <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Transaction'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}