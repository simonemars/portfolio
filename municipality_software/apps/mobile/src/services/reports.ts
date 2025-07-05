import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  GeoPoint
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { db, storage, functions } from "./firebase";
import { Report, CreateReportData } from "../types";

// Mock reports data for offline testing
const mockReports: Report[] = [
  {
    id: '1',
    description: 'Broken street light on Flanatička Street',
    photoUrls: [],
    location: { latitude: 44.8666, longitude: 13.8496 },
    addressText: 'Flanatička ulica, Pula',
    isPublic: true,
    status: 'new',
    urgencyScore: 7.5,
    voteCount: 12,
    userId: 'test-user',
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000)
  },
  {
    id: '2',
    description: 'Pothole on the road near the Arena',
    photoUrls: [],
    location: { latitude: 44.8733, longitude: 13.8500 },
    addressText: 'Pula Arena, Pula',
    isPublic: true,
    status: 'in_progress',
    urgencyScore: 8.2,
    voteCount: 8,
    userId: 'test-user',
    createdAt: new Date(Date.now() - 172800000), // 2 days ago
    updatedAt: new Date(Date.now() - 86400000)
  },
  {
    id: '3',
    description: 'Garbage bin overflowing near the port',
    photoUrls: [],
    location: { latitude: 44.8700, longitude: 13.8400 },
    addressText: 'Pula Port, Pula',
    isPublic: false,
    status: 'resolved',
    urgencyScore: 6.1,
    voteCount: 3,
    userId: 'test-admin',
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
    updatedAt: new Date(Date.now() - 172800000)
  }
];

// Mock votes data
const mockVotes = new Map<string, Set<string>>();

export const createReport = async (reportData: Omit<Report, 'id' | 'status' | 'urgencyScore' | 'voteCount' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
  try {
    const newReport: Report = {
      id: `report-${Date.now()}`,
      ...reportData,
      status: 'new',
      urgencyScore: Math.random() * 10, // Mock urgency score
      voteCount: 0,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    mockReports.push(newReport);
    return newReport.id;
  } catch (error) {
    throw error;
  }
};

export const uploadImage = async (imageUri: string, reportId: string, index: number): Promise<string> => {
  try {
    // Mock image upload - return a fake URL
    return `https://example.com/reports/${reportId}/image-${index}.jpg`;
  } catch (error) {
    throw error;
  }
};

export const getPublicReports = async (): Promise<Report[]> => {
  try {
    // Return public reports sorted by creation date
    return mockReports
      .filter(report => report.isPublic)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    throw error;
  }
};

export const getUserReports = async (userId: string): Promise<Report[]> => {
  try {
    // Return user's reports sorted by creation date
    return mockReports
      .filter(report => report.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    throw error;
  }
};

export const getReport = async (reportId: string): Promise<Report> => {
  try {
    const report = mockReports.find(r => r.id === reportId);
    if (!report) {
      throw new Error('Report not found');
    }
    return report;
  } catch (error) {
    throw error;
  }
};

export const voteReport = async (reportId: string, userId: string): Promise<void> => {
  try {
    // Check if user already voted
    if (!mockVotes.has(reportId)) {
      mockVotes.set(reportId, new Set());
    }
    
    const reportVotes = mockVotes.get(reportId)!;
    if (reportVotes.has(userId)) {
      throw new Error('You have already voted on this report');
    }
    
    // Add vote
    reportVotes.add(userId);
    
    // Update vote count
    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      report.voteCount = reportVotes.size;
    }
  } catch (error) {
    throw error;
  }
};

export const updateReportStatus = async (reportId: string, status: Report['status']): Promise<void> => {
  try {
    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      report.status = status;
      report.updatedAt = new Date();
    }
  } catch (error) {
    throw error;
  }
};

export const subscribeToReports = (
  callback: (reports: Report[]) => void,
  isPublic: boolean = true
) => {
  const q = query(
    collection(db, "reports"),
    where("isPublic", "==", isPublic),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const reports = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    })) as Report[];
    
    callback(reports);
  });
}; 