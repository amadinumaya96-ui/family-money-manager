'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Category = {
  id: string
  name: string
  father_only: boolean
}

export default function ExportPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [filterCategory, setFilterCategory] = useState('All')
  const [filterMember, setFilterMember] = useState('All')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

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
        <h1 className="text-xl font-bold text-white">Export Records</h1>

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
      </div>
    </div>
  )
}