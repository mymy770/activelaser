import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Contact, ContactSource } from '@/lib/supabase/types'

/**
 * POST /api/contacts
 * Crée un nouveau contact
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const branch_id_main = body.branch_id_main
    const first_name = body.first_name?.trim()
    const last_name = body.last_name?.trim() || null
    const phone = body.phone?.trim()
    const email = body.email?.trim() || null
    const notes_client = body.notes_client?.trim() || null
    const alias = body.alias?.trim() || null
    const source: ContactSource = body.source || 'admin_agenda'

    // Validations
    if (!branch_id_main) {
      return NextResponse.json(
        { success: false, error: 'branch_id_main is required' },
        { status: 400 }
      )
    }

    if (!first_name) {
      return NextResponse.json(
        { success: false, error: 'first_name is required' },
        { status: 400 }
      )
    }

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'phone is required' },
        { status: 400 }
      )
    }

    // Créer le contact
    const { data: contact, error: createError } = await supabase
      .from('contacts')
      .insert({
        branch_id_main,
        first_name,
        last_name,
        phone,
        email,
        notes_client,
        alias,
        source,
        status: 'active',
      } as any)
      .select()
      .single<Contact>()

    if (createError) {
      console.error('Error creating contact:', createError)
      return NextResponse.json(
        { success: false, error: createError.message || 'Failed to create contact' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
