import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Users, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ManageCoaches() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentEmailInput, setStudentEmailInput] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        if (user.role !== 'admin') {
          toast.error("Admin access required");
        }
      } catch (e) {
        toast.error("Not authenticated");
      }
    };
    fetchUser();
  }, []);

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  // Fetch all coach assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['coachAssignments'],
    queryFn: () => base44.entities.CoachAssignment.list(),
    enabled: currentUser?.role === 'admin',
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.CoachAssignment.create(data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      setShowAssignDialog(false);

      const appUrl = window.location.origin;
      const isExistingUser = allUsers.some(u => u.email === variables.student_email);

      const studentEmailBody = isExistingUser
        ? `Congratulations! You have been matched with a coach: ${variables.coach_email} on Language Mastery.\n\nYour coach is here to support your learning journey. Log in to get started!\n\n${appUrl}\n\nWelcome,\nThe Language Mastery Team`
        : `You've been invited to Language Mastery and matched with a personal coach: ${variables.coach_email}!\n\nClick the link below to create your account and start your learning journey:\n\n${appUrl}\n\nYour coach is ready and waiting to support you.\n\nWelcome,\nThe Language Mastery Team`;

      // Send emails to both coach and student
      try {
        await Promise.all([
          base44.integrations.Core.SendEmail({
            to: variables.coach_email,
            subject: "🎉 You've been assigned a new student!",
            body: `You have been assigned as a coach to ${variables.student_email} on Language Mastery.\n\nYou can now support their learning journey. Log in to view their progress and get started!\n\n${appUrl}\n\nWelcome aboard,\nThe Language Mastery Team`
          }),
          base44.integrations.Core.SendEmail({
            to: variables.student_email,
            subject: "🎉 You've been matched with a coach on Language Mastery!",
            body: studentEmailBody
          })
        ]);
      } catch (e) {
        console.error("Failed to send assignment emails:", e);
      }

      setSelectedCoach("");
      setSelectedStudent("");
      setStudentEmailInput("");
      toast.success("Coach assigned! Emails sent.");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.CoachAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      toast.success("Assignment removed");
    },
  });

  const handleAssign = () => {
    const studentEmail = studentEmailInput.trim() || selectedStudent;
    if (!selectedCoach || !studentEmail) {
      toast.error("Select a coach and enter a student email");
      return;
    }
    if (selectedCoach === studentEmail) {
      toast.error("Coach cannot manage themselves");
      return;
    }
    createAssignmentMutation.mutate({
      coach_email: selectedCoach,
      student_email: studentEmail,
      assigned_by: currentUser.email,
      assigned_at: new Date().toISOString(),
    });
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white">Access Denied</p>
      </div>
    );
  }

  // Group assignments by coach
  const assignmentsByCoach = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.coach_email]) {
      acc[assignment.coach_email] = [];
    }
    acc[assignment.coach_email].push(assignment);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Coaches</h1>
              <p className="text-white/60">Assign coaches to manage students</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAssignDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Assign Coach
          </Button>
        </div>

        <div className="space-y-4">
          {Object.keys(assignmentsByCoach).length === 0 ? (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
              <Users className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <p className="text-white/60">No coach assignments yet</p>
              <p className="text-white/40 text-sm mt-2">Click "Assign Coach" to get started</p>
            </div>
          ) : (
            Object.entries(assignmentsByCoach).map(([coachEmail, coachAssignments]) => (
              <div
                key={coachEmail}
                className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <UserCheck className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h3 className="text-white font-bold text-lg">{coachEmail}</h3>
                    <p className="text-white/60 text-sm">Managing {coachAssignments.length} student(s)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {coachAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white">{assignment.student_email}</span>
                        <span className="text-white/40 text-xs">
                          (assigned {new Date(assignment.assigned_at).toLocaleDateString()})
                        </span>
                      </div>
                      <Button
                        onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Assign Coach to Student</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Coach</label>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
              >
                <option value="">Select coach...</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.email} {user.role === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-2 block">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => { setSelectedStudent(e.target.value); setStudentEmailInput(""); }}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white mb-2"
              >
                <option value="">Select existing user...</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.email}
                  </option>
                ))}
              </select>
              <p className="text-white/40 text-xs text-center mb-2">— or invite by email —</p>
              <input
                type="email"
                value={studentEmailInput}
                onChange={(e) => { setStudentEmailInput(e.target.value); setSelectedStudent(""); }}
                placeholder="Enter new student email..."
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30"
              />
              {studentEmailInput && !allUsers.some(u => u.email === studentEmailInput) && (
                <p className="text-amber-400 text-xs mt-1">⚠️ New user — they'll receive a signup link in their email.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowAssignDialog(false)}
                variant="outline"
                className="flex-1 border-white/20 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={createAssignmentMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}