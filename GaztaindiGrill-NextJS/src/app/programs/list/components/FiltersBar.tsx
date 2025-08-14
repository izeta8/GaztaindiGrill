"use client"

import React from 'react'

type Category = { id: number; name: string }

type Props = {
  categories: Category[]
  searchName: string
  onSearchNameChange: (value: string) => void
  searchCreator: string
  onSearchCreatorChange: (value: string) => void
  selectedCategory: 'all' | number
  onCategoryChange: (value: 'all' | number) => void
}

export function FiltersBar({
  categories,
  searchName,
  onSearchNameChange,
  searchCreator,
  onSearchCreatorChange,
  selectedCategory,
  onCategoryChange,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input
        type="text"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Filtrar por nombre"
        value={searchName}
        onChange={(e) => onSearchNameChange(e.target.value)}
      />
      <select
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        value={selectedCategory}
        onChange={(e) => {
          const val = e.target.value
          onCategoryChange(val === 'all' ? 'all' : Number(val))
        }}
      >
        <option value="all">Todas las categorías</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input
        type="text"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Filtrar por creador"
        value={searchCreator}
        onChange={(e) => onSearchCreatorChange(e.target.value)}
      />
    </div>
  )
}
