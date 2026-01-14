import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Contact } from '@/lib/supabase/types'

/**
 * GET /api/contacts/search
 * Recherche de contacts avec pagination server-side
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams

    const query = searchParams.get('query') || ''
    const branchId = searchParams.get('branchId')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: 'branchId is required' },
        { status: 400 }
      )
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Construire la requête de base
    let dbQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('branch_id_main', branchId)

    // Filtrer par status si includeArchived = false
    if (!includeArchived) {
      dbQuery = dbQuery.eq('status', 'active')
    }

    // Recherche multi-champs si query fourni
    if (query.trim().length > 0) {
      const searchQuery = query.trim()
      dbQuery = dbQuery.or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      )
    }

    // Tri par défaut : plus récents
    dbQuery = dbQuery.order('created_at', { ascending: false })

    // Pagination
    dbQuery = dbQuery.range(from, to)

    const { data, error, count } = await dbQuery.returns<Contact[]>()

    if (error) {
      console.error('Error searching contacts:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search contacts' },
        { status: 500 }
      )
    }

    const contacts = data || []
    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      contacts,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search contacts' },
      { status: 500 }
    )
  }
}
