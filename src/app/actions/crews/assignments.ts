"use server";
import { assignCrewToJob, assignEmployeeToJob, removeJobAssignment } from "@/lib/crews/assignments";
export async function assignEmployeeToJobAction(jobId: string, employeeId: string, notes?: string) { return assignEmployeeToJob(jobId, employeeId, notes); }
export async function assignCrewToJobAction(jobId: string, crewId: string, notes?: string) { return assignCrewToJob(jobId, crewId, notes); }
export async function removeJobAssignmentAction(id: string) { return removeJobAssignment(id); }
