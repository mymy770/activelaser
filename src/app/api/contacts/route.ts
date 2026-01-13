import { NextRequest, NextResponse } from 'next/server'
import { getAllContacts, saveContact, updateContact } from '@/lib/contacts'

/**
 * GET /api/contacts
 * Retourne tous les contacts (CRM)
 */
export async function GET() {
  try {
    const contacts = await getAllContacts()

    // Trier par date de création (plus récent en premier)
    contacts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ success: true, contacts })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contacts
 * Crée un nouveau contact ou met à jour un contact existant
 * IMPORTANT : La liaison se fait UNIQUEMENT par contactId
 * - Si contactId est fourni → met à jour ce contact
 * - Sinon → crée TOUJOURS un nouveau contact (ne cherche PAS par téléphone/email)
 * 
 * Cela permet d'avoir plusieurs contacts avec le même numéro de téléphone
 * (ex: mari/femme, enfants utilisant le numéro des parents, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const contactId = typeof body.contactId === 'string' ? body.contactId.trim() || null : null
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
      (typeof body.source === 'string' && body.source.trim()) ||
      'admin_agenda'

    // Au moins prénom OU nom requis
    if (!firstName && !lastName) {
      return NextResponse.json(
        { success: false, error: 'First name or last name is required' },
        { status: 400 }
      )
    }

    let contact

    // Si contactId est fourni, mettre à jour ce contact
    if (contactId) {
      contact = await updateContact(contactId, {
        firstName,
        lastName,
        phone: phone || undefined,
        email,
        alias,
        notes,
        branch,
        source,
      })
      return NextResponse.json({ success: true, contact, updated: true })
    }

    // Sinon, créer TOUJOURS un nouveau contact
    // On ne cherche PAS par téléphone/email pour éviter de lier plusieurs contacts différents
    // qui partagent le même numéro (mari/femme, enfants, etc.)
    contact = await saveContact({
      firstName,
      lastName,
      phone: phone || '',
      email,
      alias,
      notes,
      branch,
      source,
    })

    return NextResponse.json({ success: true, contact, updated: false }, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating contact:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create/update contact' },
      { status: 500 }
    )
  }
}

