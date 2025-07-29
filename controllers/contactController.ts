import { Request, Response } from 'express';
import Contact from '../models/contactmodel';
import Activity, { ActivityTypes } from '../models/activityModel';
import mongoose from 'mongoose';
import { logActivity } from '../activitylogger';
import Tag from "../models/tagsmodel";
import { startOfWeek, subWeeks, endOfWeek, startOfDay, endOfDay, subDays } from "date-fns";

interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
  };
}

interface ContactData {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags?: string[] | string;
  note?: string;
}

interface ContactImport extends ContactData {}

interface DeleteMultipleContactsRequest {
  ids: string[];
}

interface ImportContactsRequest {
  contacts: ContactImport[];
}

interface ContactQuery {
  search?: string;
  page?: string;
  limit?: string;
  tags?: string;
}

const today: Date = new Date();
const startOfLastWeek: Date = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
const endOfLastWeek: Date = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

export const create_contact = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const contactData: ContactData = req.body;
    const userId = authReq.user.uid;

    // Check if contact with same email already exists
    const existingContact = await Contact.findOne({ user: userId, email: contactData.email });
    if (existingContact) {
      return res.status(400).json({ 
        success: false, 
        message: "Contact with this email already exists" 
      });
    }

    // Process tags - handle both string and array formats
    let processedTags: string[] = [];
    if (contactData.tags) {
      if (typeof contactData.tags === 'string') {
        // If tags come as comma-separated string, split them
        processedTags = contactData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(contactData.tags)) {
        // If tags come as array, just clean them
        processedTags = contactData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    // If tags are provided, ensure they exist in the Tag collection
    if (processedTags.length > 0) {
      const tagUpsertPromises = processedTags.map(async (tagName) => {
        const existingTag = await Tag.findOne({ name: tagName, user: userId });
        if (!existingTag) {
          const newTag = await Tag.findOneAndUpdate(
            { name: tagName, user: userId },
            { $setOnInsert: { name: tagName, user: userId, color: "#3b82f6" } },
            { upsert: true, new: true }
          );
          // Log tag creation activity
          await logActivity(
            userId,
            ActivityTypes.TAG_CREATED,
            `Created tag: ${newTag.name} with color ${newTag.color}`
          );
          return newTag;
        }
        return existingTag;
      });
      await Promise.all(tagUpsertPromises);
    }

    const newContact = new Contact({
      ...contactData,
      tags: processedTags, // Use processed tags instead of original
      user: userId,
      lastInteraction: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedContact = await newContact.save();

    // Log contact creation activity with detailed information
    const contactDetails = [
      `Name: ${savedContact.name}`,
      `Email: ${savedContact.email}`,
      `Phone: ${savedContact.phone}`,
      `Company: ${savedContact.company}`
    ];
    
    if (processedTags.length > 0) {
      contactDetails.push(`Tags: ${processedTags.join(', ')}`);
    }
    
    if (savedContact.note) {
      contactDetails.push(`Note: ${savedContact.note}`);
    }

    await logActivity(
      userId,
      ActivityTypes.CONTACT_CREATED,
      `Created contact: ${savedContact.name} (${savedContact.email}) - ${contactDetails.join(', ')}`,
      savedContact._id.toString()
    );

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      contact: savedContact
    });
  } catch (error: unknown) {
    console.error("Error creating contact:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create contact" 
    });
  }
};

export const get_all_contacts = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user.uid;
    const { search, page = 1, limit = 10, tags } = req.query as ContactQuery;
    
    // Build query
    const query: Record<string, unknown> = { user: userId };
    
    if (search && typeof search === 'string') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags && typeof tags === 'string') {
      query.tags = { $in: tags.split(',') };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const contacts = await Contact.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalContacts = await Contact.countDocuments(query);

    res.status(200).json({
      contacts,
      message: "Contacts retrieved successfully",
      success: true,
      pagination: {
        totalContacts,
        totalPages: Math.ceil(totalContacts / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (error: unknown) {
    console.error("Error retrieving contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
};

export const get_contact_by_id = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const contactId = req.params.id;
    const contact = await Contact.findOne({ _id: contactId, user: authReq.user.uid });
    
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json({
      contact,
      message: "Contact retrieved successfully",
      success: true
    });
  } catch (error: unknown) {
    console.error("Error retrieving contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
};

export const update_contact = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const contactId = req.params.id;
    const updateData: Partial<ContactData> = req.body;
    const userId = authReq.user.uid;

    // Process tags - handle both string and array formats
    let processedTags: string[] | undefined;
    if (updateData.tags) {
      if (typeof updateData.tags === 'string') {
        // If tags come as comma-separated string, split them
        processedTags = updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(updateData.tags)) {
        // If tags come as array, just clean them
        processedTags = updateData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      // Update the updateData with processed tags
      updateData.tags = processedTags;
    }

    // If updating email, check if it conflicts with another contact
    if (updateData.email) {
      const existingContact = await Contact.findOne({
        user: userId,
        email: updateData.email,
        _id: { $ne: contactId }
      });
      if (existingContact) {
        return res.status(400).json({ error: "Another contact with this email already exists" });
      }
    }

    // Get the old contact BEFORE updating to track changes
    const oldContact = await Contact.findOne({ _id: contactId, user: userId });
    if (!oldContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Handle tags if they're being updated
    if (processedTags && processedTags.length > 0) {
      try {
        const tagUpsertPromises = processedTags.map(async (tagName) => {
          const existingTag = await Tag.findOne({ name: tagName, user: userId });
          if (!existingTag) {
            const newTag = await Tag.findOneAndUpdate(
              { name: tagName, user: userId },
              { $setOnInsert: { name: tagName, user: userId, color: "#3b82f6" } },
              { upsert: true, new: true }
            );
            // Log tag creation activity
            await logActivity(
              userId,
              ActivityTypes.TAG_CREATED,
              `Created tag: ${newTag.name} with color ${newTag.color}`
            );
            return newTag;
          }
          return existingTag;
        });
        await Promise.all(tagUpsertPromises);
      } catch (tagError) {
        console.error("Error handling tags:", tagError);
        // Continue with update even if tag handling fails
      }
    }

    const updatedContact = await Contact.findOneAndUpdate(
      { _id: contactId, user: userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Track what fields were changed
    const changes: string[] = [];
    const fieldsToTrack = ['name', 'email', 'phone', 'company', 'note', 'tags'];
    
    fieldsToTrack.forEach(field => {
      if (updateData[field as keyof ContactData] !== undefined) {
        const oldValue = oldContact[field as keyof typeof oldContact];
        const newValue = updateData[field as keyof ContactData];
        
        if (field === 'tags') {
          const oldTags = Array.isArray(oldValue) ? oldValue : [];
          const newTags = Array.isArray(newValue) ? newValue : [];
          
          if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
            const addedTags = newTags.filter(tag => !oldTags.includes(tag));
            const removedTags = oldTags.filter(tag => !newTags.includes(tag));
            
            if (addedTags.length > 0) {
              changes.push(`Added tags: ${addedTags.join(', ')}`);
            }
            if (removedTags.length > 0) {
              changes.push(`Removed tags: ${removedTags.join(', ')}`);
            }
          }
        } else if (oldValue !== newValue) {
          changes.push(`${field}: "${oldValue}" → "${newValue}"`);
        }
      }
    });

    // Create detailed activity message
    let activityMessage = `Updated contact: ${updatedContact.name} (${updatedContact.email})`;
    if (changes.length > 0) {
      activityMessage += ` - Changes: ${changes.join(', ')}`;
    }

    // Log contact edit activity with detailed changes
    await logActivity(
      userId,
      ActivityTypes.CONTACT_EDITED,
      activityMessage,
      contactId
    );

    // Check for orphaned tags only if tags were actually updated
    if (processedTags && oldContact.tags) {
      try {
        // Find tags that were removed (existed in old but not in new)
        const oldTags = oldContact.tags || [];
        const newTags = processedTags || [];
        const removedTags = oldTags.filter((tag:string) => !newTags.includes(tag));
        
        // Only check orphaned status for tags that were actually removed
        if (removedTags.length > 0) {
          await delete_orphaned_tags(removedTags, userId);
        }
      } catch (orphanError) {
        console.error("Error handling orphaned tags:", orphanError);
        // Continue even if orphaned tag cleanup fails
      }
    }

    res.status(200).json({
      contact: updatedContact,
      message: "Contact updated successfully",
      success: true
    });
  } catch (error: unknown) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
};

export const delete_contact = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const contactId = req.params.id;
    const userId = authReq.user.uid;

    const contact = await Contact.findOne({ _id: contactId, user: userId });
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Store contact info before deletion for logging
    const contactName = contact.name;
    const contactEmail = contact.email;
    const contactPhone = contact.phone;
    const contactCompany = contact.company;
    const contactTags = contact.tags || [];
    const contactNote = contact.note;
    
    // Store tags before deletion to check for orphans
    const contactTagsForOrphans = contact.tags || [];

    await contact.deleteOne();

    // Log contact deletion activity with detailed information
    const deletedDetails = [
      `Name: ${contactName}`,
      `Email: ${contactEmail}`,
      `Phone: ${contactPhone}`,
      `Company: ${contactCompany}`
    ];
    
    if (contactTags.length > 0) {
      deletedDetails.push(`Tags: ${contactTags.join(', ')}`);
    }
    
    if (contactNote) {
      deletedDetails.push(`Note: ${contactNote}`);
    }

    await logActivity(
      userId,
      ActivityTypes.CONTACT_DELETED,
      `Deleted contact: ${contactName} (${contactEmail}) - ${deletedDetails.join(', ')}`,
      contactId
    );
    
    try {
      await delete_orphaned_tags(contactTagsForOrphans, userId);
    } catch (orphanError) {
      console.error("Error handling orphaned tags:", orphanError);
    }

    res.status(200).json({ 
      message: "Contact deleted successfully",
      success: true
    });
  } catch (error: unknown) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
};

export const delete_multiple_contacts = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { ids }: DeleteMultipleContactsRequest = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Contact IDs are required" });
    }

    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const contactsToDelete = await Contact.find({ _id: { $in: objectIds }, user: authReq.user.uid });

    const allTagsToCheck: Set<string> = new Set();
    contactsToDelete.forEach(contact => {
      if (contact.tags) contact.tags.forEach((tag:string) => allTagsToCheck.add(tag));
    });

    const result = await Contact.deleteMany({ _id: { $in: objectIds }, user: authReq.user.uid });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "No contacts found to delete" });
    }

    // Log bulk delete activity
    await logActivity(
      authReq.user.uid,
      ActivityTypes.BULK_DELETE_CONTACTS,
      `Bulk deleted ${result.deletedCount} contacts`
    );

    if (allTagsToCheck.size > 0) {
      try {
        await delete_orphaned_tags(Array.from(allTagsToCheck), authReq.user.uid);
      } catch (orphanError) {
        console.error("Error handling orphaned tags:", orphanError);
      }
    }

    res.status(200).json({ 
      message: `${result.deletedCount} contacts deleted successfully`, 
      success: true 
    });
  } catch (error: unknown) {
    console.error("Error deleting multiple contacts:", error);
    res.status(500).json({ error: "Failed to delete contacts" });
  }
};

export const import_contacts = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { contacts }: ImportContactsRequest = req.body;
    const userId = authReq.user.uid;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: "No contacts provided for import" });
    }

    const allTags: Set<string> = new Set();
    contacts.forEach(contact => {
      if (contact.tags) {
        // Handle both string and array formats
        if (typeof contact.tags === 'string') {
          // If tags come as comma-separated string, split them
          contact.tags.split(',').forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag) allTags.add(trimmedTag);
          });
        } else if (Array.isArray(contact.tags)) {
          // If tags come as array, process each tag
          contact.tags.forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) allTags.add(trimmedTag);
          });
        }
      }
    });

    const tagUpsertPromises = Array.from(allTags).map(async (tagName) => {
      const existingTag = await Tag.findOne({ name: tagName, user: userId });
      if (!existingTag) {
        const newTag = await Tag.findOneAndUpdate(
          { name: tagName, user: userId },
          { $setOnInsert: { name: tagName, user: userId, color: "#3b82f6" } },
          { upsert: true, new: true }
        );
        // Log tag creation activity
        await logActivity(
          userId,
          ActivityTypes.TAG_CREATED,
          `Created tag: ${newTag.name} with color ${newTag.color}`
        );
        return newTag;
      }
      return existingTag;
    });
    await Promise.all(tagUpsertPromises);

    const existingEmails = await Contact.find({ user: userId, email: { $in: contacts.map(c => c.email) } }, { email: 1 });
    const existingEmailSet = new Set(existingEmails.map(c => c.email));

    const newContacts = contacts.filter(c => !existingEmailSet.has(c.email));
    const duplicateContacts = contacts.filter(c => existingEmailSet.has(c.email));

    if (newContacts.length === 0) {
      return res.status(400).json({
        error: "All contacts already exist",
        success: false,
        imported: 0,
        rejected: contacts.length,
        duplicates: duplicateContacts.map(c => ({ email: c.email, name: c.name }))
      });
    }

    const contactsToInsert = newContacts.map(contact => {
      // Process tags for insertion - convert to array format
      let processedTags: string[] = [];
      if (contact.tags) {
        if (typeof contact.tags === 'string') {
          processedTags = contact.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(contact.tags)) {
          processedTags = contact.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
      }

      return {
        user: userId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone || "",
        company: contact.company || "",
        tags: processedTags,
        note: contact.note || "",
        lastInteraction: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    const insertedContacts = await Contact.insertMany(contactsToInsert);

    // Log bulk import activity
    await logActivity(
      userId,
      ActivityTypes.BULK_IMPORT_CONTACTS,
      `Imported ${insertedContacts.length} contacts. ${duplicateContacts.length} duplicates rejected`
    );

    res.status(200).json({
      message: `Successfully imported ${insertedContacts.length} contacts. ${duplicateContacts.length} duplicates rejected.`,
      success: true,
      imported: insertedContacts.length,
      rejected: duplicateContacts.length,
      duplicates: duplicateContacts.map(c => ({ email: c.email, name: c.name })),
      importedContacts: insertedContacts
    });
  } catch (error: unknown) {
    console.error("Error importing contacts:", error);
    res.status(500).json({ error: "Failed to import contacts" });
  }
};

export const count_of_contact = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.user.uid;

    // Get all contacts for the user
    const allContacts = await Contact.find({ user: userId }).select('name email company tags createdAt');

    // Get total contacts count
    const totalContacts = await Contact.countDocuments({ user: userId });

    // Get contacts created in the last 7 days
    const last7DaysContacts = await Contact.countDocuments({
      user: userId,
      createdAt: { 
        $gte: startOfDay(subDays(new Date(), 7)),
        $lte: endOfDay(new Date())
      }
    });

    // Get contacts created last week (Monday to Sunday)
    const lastWeekContacts = await Contact.countDocuments({
      user: userId,
      createdAt: {
        $gte: startOfLastWeek,
        $lte: endOfLastWeek
      }
    });

    // Get contacts by company for chart
    const contactsByCompany = await Contact.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$company",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: "$_id",
          contacts: "$count",
          _id: 0
        }
      }
    ]);

    // Get tag distribution
    const tagDistribution = await Contact.aggregate([
      { $match: { user: userId } },
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    // Get activities count
    const activities = await Activity.countDocuments({ user: userId });

    // Get activities by day for the last 7 days
    const activitiesByDay: { [key: string]: number } = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayName = dayNames[date.getDay()];
      const count = await Activity.countDocuments({
        user: userId,
        timestamp: {
          $gte: startOfDay(date),
          $lte: endOfDay(date)
        }
      });
      activitiesByDay[dayName] = count;
    }

    res.status(200).json({
      success: true,
      message: "Contact statistics retrieved successfully",
      data: {
        allContacts,
        totalContacts,
        newThisWeek: last7DaysContacts,
        contactsByCompany,
        tagDistribution,
        activities,
        activitiesByDay
      }
    });
  } catch (error: unknown) {
    console.error("Error getting contact statistics:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch contact counts" 
    });
  }
};

export const delete_orphaned_tags = async (tags: string[], userId: string): Promise<void> => {
  if (!tags.length) return;
  for (const tag of tags) {
    try {
      const isUsed = await Contact.exists({ user: userId, tags: tag });
      if (!isUsed) {
        const deletedTag = await Tag.findOneAndDelete({ name: tag, user: userId });
        if (deletedTag) {
          // Log tag deletion activity
          await logActivity(
            userId,
            ActivityTypes.TAG_DELETED,
            `Deleted orphaned tag: ${deletedTag.name}`
          );
        }
      }
    } catch (error: unknown) {
      console.error(`Error checking/deleting tag ${tag}:`, error);
      // Continue with other tags even if one fails
    }
  }
};