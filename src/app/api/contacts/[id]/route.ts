import { NextRequest, NextResponse } from 'next/server'
import { updateContact, deleteContact, getAllContacts } from '@/lib/contacts'

/**
 * PUT /api/contacts/[id]
 * Met à jour un contact spécifique
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const phone = (body.phone || '').toString().trim() || null
    const firstName =
      typeof body.firstName === 'string' ? body.firstName.trim() || null : null
    const lastName =
      typeof body.lastName === 'string' ? body.lastName.trim() || null : null
    const email =
      typeof body.email === 'string' ? body.email.trim() || null : null
    const alias =
      typeof body.alias === 'string' ? body.alias.trim() || null : null
    const notes =
      typeof body.notes === 'string' ? body.notes.trim() || null : null
    const branch =
      typeof body.branch === 'string' ? body.branch.trim() || null : null
    const source =
      (typeof body.source === 'string' && body.source.trim()) || undefined

    // Au moins prénom OU nom requis
    if (!firstName && !lastName) {
      return NextResponse.json(
        { success: false, error: 'First name or last name is required' },
        { status: 400 }
      )
    }

    const contact = await updateContact(id, {
      firstName,
      lastName,
      phone: phone || undefined,
      email,
      alias,
      notes,
      branch,
      source,
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/contacts/[id]
 * Supprime un contact spécifique
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await deleteContact(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/contacts/[id]
 * Récupère un contact spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contacts = await getAllContacts()
    const contact = contacts.find(c => c.id === id)

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}
