import { ApplicantPreferences, type IApplicantPreferencesDocument } from "../models/ApplicantPreferences.ts";
import { isDatabaseConnected } from "../db/mongodb.ts";
import { generateObjectId, isValidObjectId } from "../db/user-repository.ts";
import {
  type IApplicantPreferences,
  type UpdateApplicantPreferencesInput,
  DEFAULT_APPLICANT_PREFERENCES,
} from "../types/preference-types.ts";

class ApplicantPreferencesRepository {
  private inMemoryPreferences: Map<string, IApplicantPreferences> = new Map(); // Key: userId

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults(): void {
    this.inMemoryPreferences.clear();
    // Default seed for Aarav Mehta (65f1a2b3c4d5e6f7a8b9c008)
    const aaravId = "65f1a2b3c4d5e6f7a8b9c008";
    this.inMemoryPreferences.set(aaravId, {
      id: "65f1a2b3c4d5e6f7a8b9c801",
      userId: aaravId,
      applicationStatusUpdates: true,
      interviewReminders: true,
      jobRecommendationAlerts: true,
      messageNotifications: true,
      emailNotifications: true,
      createdAt: "2025-04-12T15:20:00.000Z",
      updatedAt: "2025-04-12T15:20:00.000Z",
    });
  }

  public clearAll(): void {
    this.inMemoryPreferences.clear();
  }

  public async findByUserId(userId: string): Promise<IApplicantPreferences> {
    if (isDatabaseConnected() && isValidObjectId(userId)) {
      let doc = await ApplicantPreferences.findOne({ userId }).lean<any>();

      if (!doc) {
        const id = generateObjectId();
        const created = await ApplicantPreferences.create({
          _id: id,
          userId,
          ...DEFAULT_APPLICANT_PREFERENCES,
        } as any);

        const pref: IApplicantPreferences = {
          id: (created as any)._id ? (created as any)._id.toString() : id,
          userId: created.userId ? created.userId.toString() : userId,
          applicationStatusUpdates: created.applicationStatusUpdates ?? true,
          interviewReminders: created.interviewReminders ?? true,
          jobRecommendationAlerts: created.jobRecommendationAlerts ?? true,
          messageNotifications: created.messageNotifications ?? true,
          emailNotifications: created.emailNotifications ?? true,
          createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: created.updatedAt instanceof Date ? created.updatedAt.toISOString() : new Date().toISOString(),
        };

        this.inMemoryPreferences.set(userId, pref);
        return pref;
      }

      const pref: IApplicantPreferences = {
        id: doc._id ? doc._id.toString() : doc.id,
        userId: doc.userId?.toString() || userId,
        applicationStatusUpdates: doc.applicationStatusUpdates ?? true,
        interviewReminders: doc.interviewReminders ?? true,
        jobRecommendationAlerts: doc.jobRecommendationAlerts ?? true,
        messageNotifications: doc.messageNotifications ?? true,
        emailNotifications: doc.emailNotifications ?? true,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt || new Date().toISOString(),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt || new Date().toISOString(),
      };

      this.inMemoryPreferences.set(userId, pref);
      return pref;
    }

    // In-memory fallback
    let existing = this.inMemoryPreferences.get(userId);
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: generateObjectId(),
        userId,
        ...DEFAULT_APPLICANT_PREFERENCES,
        createdAt: now,
        updatedAt: now,
      };
      this.inMemoryPreferences.set(userId, existing);
    }

    return { ...existing };
  }

  public async updateByUserId(
    userId: string,
    updates: UpdateApplicantPreferencesInput,
  ): Promise<IApplicantPreferences> {
    const now = new Date().toISOString();

    const updateFields: Partial<IApplicantPreferences> = {};
    if (typeof updates.applicationStatusUpdates === "boolean") {
      updateFields.applicationStatusUpdates = updates.applicationStatusUpdates;
    }
    if (typeof updates.interviewReminders === "boolean") {
      updateFields.interviewReminders = updates.interviewReminders;
    }
    if (typeof updates.jobRecommendationAlerts === "boolean") {
      updateFields.jobRecommendationAlerts = updates.jobRecommendationAlerts;
    }
    if (typeof updates.messageNotifications === "boolean") {
      updateFields.messageNotifications = updates.messageNotifications;
    }
    if (typeof updates.emailNotifications === "boolean") {
      updateFields.emailNotifications = updates.emailNotifications;
    }

    if (isDatabaseConnected() && isValidObjectId(userId)) {
      const doc = await ApplicantPreferences.findOneAndUpdate(
        { userId },
        {
          $set: {
            ...updateFields,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            _id: generateObjectId(),
            userId,
            ...DEFAULT_APPLICANT_PREFERENCES,
            createdAt: new Date(),
          },
        },
        { new: true, upsert: true },
      ).lean<any>();

      const pref: IApplicantPreferences = {
        id: doc._id ? doc._id.toString() : doc.id,
        userId: doc.userId?.toString() || userId,
        applicationStatusUpdates: doc.applicationStatusUpdates ?? true,
        interviewReminders: doc.interviewReminders ?? true,
        jobRecommendationAlerts: doc.jobRecommendationAlerts ?? true,
        messageNotifications: doc.messageNotifications ?? true,
        emailNotifications: doc.emailNotifications ?? true,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt || now,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt || now,
      };

      this.inMemoryPreferences.set(userId, pref);
      return pref;
    }

    // In-memory fallback
    const current = await this.findByUserId(userId);
    const updated: IApplicantPreferences = {
      ...current,
      ...updateFields,
      updatedAt: now,
    };

    this.inMemoryPreferences.set(userId, updated);
    return { ...updated };
  }
}

export const applicantPreferencesRepository = new ApplicantPreferencesRepository();
