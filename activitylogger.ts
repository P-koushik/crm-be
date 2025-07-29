import Activity from "./models/activityModel";
import { ActivityTypes } from "./models/activityModel";

// Optional: Interface for logActivity function parameters
export const logActivity = async (
  userId: string,
  activityType: ActivityTypes,
  details: string = "",
  contactId?: string
): Promise<void> => {
  try {
    if (!userId) {
      console.error("No user ID provided for activity logging");
      return;
    }

    await Activity.create({
      user: userId,
      activityType,
      details,
      contactId: contactId || undefined,
      timestamp: new Date(),
    });

  } catch (error: unknown) {
    console.error("Activity logging failed:", error as string);
  }
};
