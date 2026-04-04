import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Users, UserCheck, ClipboardList, StickyNote, BookOpen } from "lucide-react";
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

  // Fetch all coach notes
  const { data: coachNotes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['coachNotes'],
    queryFn: () => base44.entities.CoachNote.list('-created_date'),
    enabled: currentUser?.role === 'admin',
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.CoachNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachNotes'] });
      toast.success("Note deleted");
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.CoachAssignment.create(data),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      setShowAssignDialog(false);

      const appUrl = window.location.origin;
      const isExistingUser = allUsers.some(u => u.email === variables.student_email);

      try {
        // If new user, invite them (platform sends login credentials automatically)
        if (!isExistingUser) {
          await base44.users.inviteUser(variables.student_email, "user");
        }

        // Send coach notification + student notification (always send to student)
        await Promise.all([
          base44.integrations.Core.SendEmail({
            to: variables.coach_email,
            subject: "🎉 You've been assigned a new student!",
            body: `You have been assigned as a coach to ${variables.student_email} on Language Mastery.\n\nYou can now support their learning journey. Log in to view their progress and get started!\n\n${appUrl}\n\nWelcome aboard,\nThe Language Mastery Team`
          }),
          base44.integrations.Core.SendEmail({
            to: variables.student_email,
            subject: "🎉 You've been matched with a coach on Language Mastery!",
            body: `${isExistingUser ? "Great news!" : "Welcome to Language Mastery!"} You have been matched with a personal coach: ${variables.coach_email}.\n\n${isExistingUser ? "Log in to your account to get started" : "Your account has been created — log in with your email address"}:\n\n${appUrl}\n\nYour coach is ready to support your learning journey.\n\nWelcome,\nThe Language Mastery Team`
          }),
        ]);
      } catch (e) {
        console.error("Failed to invite/notify:", e);
      }

      setSelectedCoach("");
      setSelectedStudent("");
      setStudentEmailInput("");
      toast.success(isExistingUser ? "Coach assigned! Notification sent." : "Coach assigned! Account created and login details sent to student.");
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

  // People who appear only in notes (no formal assignment yet)
  // Group all notes by student_name (case-insensitive)
  const notePeopleMap = {};
  for (const note of coachNotes) {
    const key = note.student_name.toLowerCase();
    if (!notePeopleMap[key]) notePeopleMap[key] = { name: note.student_name, notes: [], allWords: [] };
    notePeopleMap[key].notes.push(note);
    if (note.words) notePeopleMap[key].allWords.push(...note.words);
  }
  // Only show people NOT already in assignments
  const assignedNames = new Set(
    assignments.map(a => {
      const u = allUsers.find(u2 => u2.email === a.student_email);
      return (u?.full_name || "").toLowerCase();
    }).filter(Boolean)
  );
  const notePeople = Object.values(notePeopleMap).filter(p =>
    !assignedNames.has(p.name.toLowerCase())
  );

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
          <div className="flex gap-2">
            <Button
              onClick={() => window.open(createPageUrl("Onboarding"), '_blank')}
              variant="outline"
              className="border-white/20 text-white"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Questionnaire
            </Button>
            <Button
              onClick={() => setShowAssignDialog(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Assign Coach
            </Button>
          </div>
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

                <div className="space-y-4">
                  {coachAssignments.map((assignment) => {
                    // Find notes for this student by email or name match
                    const studentUser = allUsers.find(u => u.email === assignment.student_email);
                    const studentName = studentUser?.full_name || "";
                    const studentNotes = coachNotes.filter(n =>
                      n.student_email === assignment.student_email ||
                      (studentName && n.student_name.toLowerCase() === studentName.toLowerCase())
                    );

                    return (
                      <div key={assignment.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{assignment.student_email}</span>
                            {studentName && <span className="text-white/50 text-xs">({studentName})</span>}
                            <span className="text-white/40 text-xs">
                              assigned {new Date(assignment.assigned_at).toLocaleDateString()}
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

                        {/* Coach Notes for this student */}
                        {studentNotes.length > 0 && (
                          <div className="border-t border-white/10 px-3 py-2 space-y-2">
                            <p className="text-yellow-300 text-xs font-semibold flex items-center gap-1">
                              <StickyNote className="w-3 h-3" /> Coach Notes ({studentNotes.length})
                            </p>
                            {studentNotes.map(note => (
                              <div key={note.id} className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-white/80 text-sm flex-1 whitespace-pre-wrap">{note.note}</p>
                                  <button
                                    onClick={() => deleteNoteMutation.mutate(note.id)}
                                    className="text-white/30 hover:text-red-400 flex-shrink-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                {note.words?.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    <span className="text-white/40 text-xs flex items-center gap-1"><BookOpen className="w-3 h-3" /> Words:</span>
                                    {note.words.map((w, i) => (
                                      <span key={i} className="bg-cyan-500/20 text-cyan-300 text-xs px-1.5 py-0.5 rounded">{w}</span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-white/30 text-xs mt-1">by {note.coach_email} · {new Date(note.created_date).toLocaleDateString()}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* People from Notes — tagged via @mention but not formally assigned */}
        {notePeople.length > 0 && (
          <div className="mt-8">
            <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> People from Notes
            </h2>
            <div className="space-y-3">
              {notePeople.map(person => {
                const uniqueWords = [...new Set(person.allWords)];
                return (
                  <div key={person.name} className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold text-base">👤 {person.name}</h3>
                      <span className="text-yellow-300/60 text-xs">{person.notes.length} note(s)</span>
                    </div>

                    {/* All words across notes */}
                    {uniqueWords.length > 0 && (
                      <div className="mb-3">
                        <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Saved Words</p>
                        <div className="flex flex-wrap gap-1">
                          {uniqueWords.map((w, i) => (
                            <span key={i} className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                      {person.notes.map(note => (
                        <div key={note.id} className="bg-white/5 rounded-lg p-2.5 flex items-start justify-between gap-2">
                          <p className="text-white/70 text-sm flex-1 whitespace-pre-wrap">{note.note}</p>
                          <button
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            className="text-white/20 hover:text-red-400 flex-shrink-0 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
                <p className="text-amber-400 text-xs mt-1">✉️ New user — an account will be created and login details sent to their email automatically.</p>
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