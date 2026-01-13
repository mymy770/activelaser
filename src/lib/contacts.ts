/**
 * Gestion des contacts (CRM léger) stockés dans un fichier JSON
 */

import { promises as fs } from 'fs'
import { join } from 'path'

export interface Contact {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string
  email: string | null
  alias: string | null // Surnom (ex: nom de la personne qui fête son anniversaire)
  notes: string | null
  branch: string | null
  source: 'admin_agenda' | 'public_booking' | string
  createdAt: string
}

const CONTACTS_FILE = join(process.cwd(), 'data', 'contacts.json')

/**
 * Lit tous les contacts depuis le fichier JSON
 */
export async function getAllContacts(): Promise<Contact[]> {
  try {
    const data = await fs.readFile(CONTACTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // Si le fichier n'existe pas encore, retourner un tableau vide
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    console.error('Error reading contacts:', error)
    throw error
  }
}

/**
 * Trouve un contact existant par téléphone ou email
 */
export async function findContactByPhoneOrEmail(
  phone: string | null,
  email: string | null
): Promise<Contact | null> {
  try {
    const contacts = await getAllContacts()
    
    if (phone) {
      const byPhone = contacts.find(c => c.phone === phone)
      if (byPhone) return byPhone
    }
    
    if (email) {
      const byEmail = contacts.find(c => c.email === email)
      if (byEmail) return byEmail
    }
    
    return null
  } catch (error) {
    console.error('Error finding contact:', error)
    return null
  }
}

/**
 * Met à jour un contact existant
 */
export async function updateContact(
  id: string,
  updates: Partial<Omit<Contact, 'id' | 'createdAt'>>
): Promise<Contact> {
  try {
    const contacts = await getAllContacts()
    const index = contacts.findIndex(c => c.id === id)
    
    if (index === -1) {
      throw new Error(`Contact with id ${id} not found`)
    }
    
    // Mettre à jour les champs fournis, en gardant les anciens pour les champs non fournis
    contacts[index] = {
      ...contacts[index],
      // Ne pas écraser avec null/undefined si le champ n'est pas fourni
      firstName: updates.firstName !== undefined ? updates.firstName : contacts[index].firstName,
      lastName: updates.lastName !== undefined ? updates.lastName : contacts[index].lastName,
      phone: updates.phone !== undefined && updates.phone !== null ? updates.phone : contacts[index].phone,
      email: updates.email !== undefined ? updates.email : contacts[index].email,
      alias: updates.alias !== undefined ? updates.alias : contacts[index].alias, // Traité exactement comme firstName
      notes: updates.notes !== undefined ? updates.notes : contacts[index].notes,
      branch: updates.branch !== undefined ? updates.branch : contacts[index].branch,
      source: updates.source !== undefined ? updates.source : contacts[index].source,
    }
    
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf-8')
    
    return contacts[index]
  } catch (error) {
    console.error('Error updating contact:', error)
    throw error
  }
}

/**
 * Supprime un contact par son ID
 */
export async function deleteContact(id: string): Promise<boolean> {
  try {
    const contacts = await getAllContacts()
    const filtered = contacts.filter(c => c.id !== id)
    
    if (filtered.length === contacts.length) {
      throw new Error(`Contact with id ${id} not found`)
    }
    
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8')
    
    return true
  } catch (error) {
    console.error('Error deleting contact:', error)
    throw error
  }
}

/**
 * Sauvegarde un nouveau contact ou met à jour un contact existant
 */
export async function saveContact(
  contact: Omit<Contact, 'id' | 'createdAt'>
): Promise<Contact> {
  try {
    const contacts = await getAllContacts()

    const newContact: Contact = {
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
    }

    contacts.push(newContact)

    await fs.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2), 'utf-8')

    return newContact
  } catch (error) {
    console.error('Error saving contact:', error)
    throw error
  }
}

