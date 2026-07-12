'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  'Other',
]

export default function NewTransactionPage() {
  const router = useRouter()
  const [type, setType] = useState<'Expense' | 'Income'>('Expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!amount || !date) {
      setErrorMsg('Please fill in amount and date.')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase.from('transactions').insert({
      member: 'Mother', // temporary — will come from login later
      type: type,
      category: category,
      amount: Number(amount),
      currency: 'LKR', // temporary — will depend on user later
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

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Transaction</h1>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setType('Expense')}
          className={`flex-1 py-2 rounded-lg font-semibold ${
            type === 'Expense'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType('Income')}
          className={`flex-1 py-2 rounded-lg font-semibold ${
            type === 'Income'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Income / Return
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="Optional note"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Transaction'}
        </button>
      </form>
    </div>
  )
}