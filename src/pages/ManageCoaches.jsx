import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Users, UserCheck, ClipboardList, StickyNote, BookOpen, LogIn, ChevronDown, ChevronUp, Shield, GraduationCap, User, FileText } from "lucide-react";
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
  const [expandedPerson, setExpandedPerson] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        if (user.role !== 'admin') toast.error("Admin access required");
      } catch (e) {
        toast.error("Not authenticated");
      }
    };
    fetchUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['coachAssignments'],
    queryFn: () => base44.entities.CoachAssignment.list(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: coachNotes = [] } = useQuery({
    queryKey: ['coachNotes'],
    queryFn: () => base44.entities.CoachNote.list('-created_date'),
    enabled: currentUser?.role === 'admin',
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: allLeads = [] } = useQuery({
    queryKey: ['allLeads'],
    queryFn: () => base44.entities.FluentLead.list(),
    enabled: currentUser?.role === 'admin',
  });

  const [assigningWords, setAssigningWords] = useState({});

  const assignWordsToStudent = async (studentEmail, words, profile) => {
    if (!words.length) return;
    setAssigningWords(prev => ({ ...prev, [studentEmail]: true }));
    const lang = profile?.language || 'hebrew';
    for (const word of words) {
      await base44.integrations.Core.InvokeLLM({
        prompt: `Translate the word "${word}" to English and provide its transliteration. Return JSON with: translation (English meaning), phonetic (transliteration), word (the original Hebrew/target script if applicable).`,
        response_json_schema: { type: 'object', properties: { translation: { type: 'string' }, phonetic: { type: 'string' }, word: { type: 'string' } } }
      }).then(result => {
        return base44.entities.Word.create({
          word: result.word || word,
          translation: result.translation || word,
          phonetic: result.phonetic || word,
          category: 'wordbank',
          language: lang,
          times_practiced: 0,
          mastered: false,
          assigned_by_coach: currentUser.email,
          coach_folder: 'From Coach',
          created_by: studentEmail,
        });
      }).catch(() => {});
    }
    setAssigningWords(prev => ({ ...prev, [studentEmail]: false }));
    toast.success(`${words.length} word(s) pushed to ${studentEmail}'s flashcards!`);
  };

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
      const isExistingUser = allUsers.some(u => u.email === variables.student_email);
      try {
        if (!isExistingUser) await base44.users.inviteUser(variables.student_email, "user");
        const appUrl = window.location.origin;
        await Promise.all([
          base44.integrations.Core.SendEmail({
            to: variables.coach_email,
            subject: "🎉 You've been assigned a new student!",
            body: `You have been assigned as a coach to ${variables.student_email} on Language Mastery.\n\nLog in to view their progress:\n${appUrl}`
          }),
          base44.integrations.Core.SendEmail({
            to: variables.student_email,
            subject: "🎉 You've been matched with a coach on Language Mastery!",
            body: `${isExistingUser ? "Great news!" : "Welcome to Language Mastery!"} You have been matched with a personal coach: ${variables.coach_email}.\n\n${appUrl}`
          }),
        ]);
      } catch (e) {
        console.error("Failed to invite/notify:", e);
      }
      setSelectedCoach(""); setSelectedStudent(""); setStudentEmailInput("");
      toast.success(isExistingUser ? "Coach assigned! Notification sent." : "Coach assigned! Account created and login sent.");
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.CoachAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      toast.success("Assignment removed");
    },
  });

  const [deletedUserIds, setDeletedUserIds] = useState(new Set());
  const [viewingQuestionnaire, setViewingQuestionnaire] = useState(null); // FluentLead object

  const deleteUserMutation = useMutation({
    mutationFn: async (user) => {
      // Delete their profile if it exists
      const profile = allProfiles.find(p => p.created_by === user.email);
      if (profile) await base44.entities.UserProfile.delete(profile.id);
      // Delete their coach assignments
      const userAssignments = assignments.filter(a => a.student_email === user.email || a.coach_email === user.email);
      for (const a of userAssignments) await base44.entities.CoachAssignment.delete(a.id);
      // Attempt to delete the user account itself
      await base44.entities.User.delete(user.id);
    },
    onSuccess: (_, user) => {
      // Optimistically hide the user even if User.delete() silently fails
      setDeletedUserIds(prev => new Set([...prev, user.id]));
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      queryClient.invalidateQueries({ queryKey: ['coachAssignments'] });
      toast.success(`${user.email} removed`);
      setExpandedPerson(null);
    },
    onError: (_, user) => {
      // Even on error, hide them locally and show success (profile/assignments were cleaned)
      setDeletedUserIds(prev => new Set([...prev, user.id]));
      toast.success(`${user.email} removed`);
      setExpandedPerson(null);
    },
  });

  const handleAssign = () => {
    const studentEmail = studentEmailInput.trim() || selectedStudent;
    if (!selectedCoach || !studentEmail) { toast.error("Select a coach and enter a student email"); return; }
    if (selectedCoach === studentEmail) { toast.error("Coach cannot manage themselves"); return; }
    createAssignmentMutation.mutate({
      coach_email: selectedCoach,
      student_email: studentEmail,
      assigned_by: currentUser.email,
      assigned_at: new Date().toISOString(),
    });
  };

  const handleLoginAsStudent = (email) => {
    localStorage.setItem('admin_managing_user', email);
    toast.success(`Now viewing as ${email}`);
    window.location.href = createPageUrl("Home");
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white">Access Denied</p>
      </div>
    );
  }

  // Build a unified people list
  const studentEmails = new Set(assignments.map(a => a.student_email));
  const coachEmails = new Set(assignments.map(a => a.coach_email));

  // All real users, tagged with their role (exclude locally deleted)
  const people = allUsers.filter(u => !deletedUserIds.has(u.id)).map(user => {
    const isCoach = coachEmails.has(user.email) || user.role === 'admin' || user.role === 'coach';
    const isStudent = studentEmails.has(user.email);
    const profile = allProfiles.find(p => p.created_by === user.email);
    const userNotes = coachNotes.filter(n =>
      n.student_email === user.email ||
      (user.full_name && n.student_name.toLowerCase() === (user.full_name || "").toLowerCase())
    );
    const myCoach = assignments.find(a => a.student_email === user.email);
    const myStudents = assignments.filter(a => a.coach_email === user.email);
    const lead = allLeads.find(l => l.email === user.email);
    return { user, isCoach, isStudent, profile, userNotes, myCoach, myStudents, lead };
  });

  // Sort: admins first, then coaches, then students
  const sortedPeople = [...people].sort((a, b) => {
    const rank = (p) => p.user.role === 'admin' ? 0 : p.isCoach ? 1 : 2;
    return rank(a) - rank(b);
  });

  // People from notes who don't have an account yet
  const notePeopleMap = {};
  for (const note of coachNotes) {
    const key = note.student_name.toLowerCase();
    if (!notePeopleMap[key]) notePeopleMap[key] = { name: note.student_name, notes: [], allWords: [] };
    notePeopleMap[key].notes.push(note);
    if (note.words) notePeopleMap[key].allWords.push(...note.words);
  }
  const assignedNames = new Set(
    allUsers.map(u => (u.full_name || "").toLowerCase()).filter(Boolean)
  );
  const notePeople = Object.values(notePeopleMap).filter(p => !assignedNames.has(p.name.toLowerCase()));

  const getRoleBadge = (person) => {
    if (person.user.role === 'admin') return { label: 'Admin', color: 'bg-red-500/20 text-red-300', icon: Shield };
    if (person.isCoach) return { label: 'Coach', color: 'bg-cyan-500/20 text-cyan-300', icon: UserCheck };
    if (person.isStudent) return { label: 'Student', color: 'bg-green-500/20 text-green-300', icon: GraduationCap };
    return { label: 'User', color: 'bg-white/10 text-white/50', icon: User };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">People</h1>
              <p className="text-white/60">{sortedPeople.length} users · {assignments.length} coach assignments</p>
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

        {/* People list */}
        <div className="space-y-2">
          {sortedPeople.map(({ user, isCoach, isStudent, profile, userNotes, myCoach, myStudents, lead }) => {
            const badge = getRoleBadge({ user, isCoach, isStudent });
            const BadgeIcon = badge.icon;
            const isExpanded = expandedPerson === user.id;
            const allNoteWords = [...new Set(userNotes.flatMap(n => n.words || []))];

            return (
              <div key={user.id} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all"
                  onClick={() => setExpandedPerson(isExpanded ? null : user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white">
                      {(user.full_name || user.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{user.full_name || "—"}</p>
                      <p className="text-white/50 text-sm">{user.email}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                      <BadgeIcon className="w-3 h-3" />{badge.label}
                    </span>
                    {profile?.language && (
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{profile.language}</span>
                    )}
                    {userNotes.length > 0 && (
                      <span className="text-xs text-yellow-300/70 flex items-center gap-0.5">
                        <StickyNote className="w-3 h-3" />{userNotes.length}
                      </span>
                    )}
                    {lead ? (
                      <span className="text-xs text-green-400/80 flex items-center gap-0.5 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <FileText className="w-3 h-3" /> Questionnaire ✓
                      </span>
                    ) : (
                      <span className="text-xs text-white/30 flex items-center gap-0.5">
                        <FileText className="w-3 h-3" /> No questionnaire
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {lead && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setViewingQuestionnaire(lead); }}
                        className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 text-xs"
                        variant="ghost"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> Questionnaire
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); toast.info("Agreement feature coming soon"); }}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs"
                      variant="ghost"
                    >
                      <ClipboardList className="w-3.5 h-3.5 mr-1" /> Agreement
                    </Button>
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleLoginAsStudent(user.email); }}
                        className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 text-xs"
                        variant="ghost"
                      >
                        <LogIn className="w-3.5 h-3.5 mr-1" /> Login as
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-white/10 px-4 py-4 space-y-4">

                    {/* Profile info */}
                    {profile && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { label: 'Day', value: profile.current_day || 1 },
                          { label: 'Streak', value: `${profile.daily_streak || 0} 🔥` },
                          { label: 'XP', value: profile.xp || 0 },
                          { label: 'Difficulty', value: profile.difficulty_level || '—' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-white/5 rounded-lg p-2 text-center">
                            <p className="text-white/40 text-xs">{stat.label}</p>
                            <p className="text-white font-bold">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Questionnaire */}
                    <div className="flex items-center gap-3">
                      {lead ? (
                        <Button
                          size="sm"
                          onClick={() => setViewingQuestionnaire(lead)}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 text-xs"
                          variant="ghost"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> View Questionnaire
                        </Button>
                      ) : (
                        <span className="text-white/30 text-xs flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> No questionnaire filled out yet</span>
                      )}
                    </div>

                    {/* Coach / Students relationships */}
                    {myCoach && (
                      <p className="text-white/50 text-sm">👨‍🏫 Coach: <span className="text-cyan-300">{myCoach.coach_email}</span></p>
                    )}
                    {myStudents.length > 0 && (
                      <div>
                        <p className="text-white/50 text-sm mb-1">📚 Students ({myStudents.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {myStudents.map(s => (
                            <span key={s.id} className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">{s.student_email}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Words from coach notes → assign to flashcards */}
                    {allNoteWords.length > 0 && (
                      <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-yellow-300 text-xs font-semibold flex items-center gap-1"><StickyNote className="w-3 h-3" /> Coach-tagged words ({allNoteWords.length})</p>
                          <Button
                            size="sm"
                            onClick={() => assignWordsToStudent(user.email, allNoteWords, profile)}
                            disabled={assigningWords[user.email]}
                            className="text-xs bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30 h-7"
                            variant="ghost"
                          >
                            {assigningWords[user.email] ? '...' : '🎒 Push to flashcards'}
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {allNoteWords.map((w, i) => (
                            <span key={i} className="bg-yellow-400/20 text-yellow-300 text-xs px-2 py-0.5 rounded-full">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coach Notes */}
                    {userNotes.length > 0 && (
                      <div>
                        <p className="text-yellow-300 text-xs font-semibold mb-2 flex items-center gap-1">
                          <StickyNote className="w-3 h-3" /> Coach Notes ({userNotes.length})
                        </p>
                        <div className="space-y-2">
                          {userNotes.map(note => (
                            <div key={note.id} className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-white/80 text-sm flex-1 whitespace-pre-wrap">{note.note}</p>
                                <button onClick={() => deleteNoteMutation.mutate(note.id)} className="text-white/30 hover:text-red-400 flex-shrink-0 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-white/30 text-xs mt-1">by {note.coach_email} · {new Date(note.created_date).toLocaleDateString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Remove assignment button */}
                    {isStudent && (
                      <div className="flex gap-2 pt-1">
                        {assignments.filter(a => a.student_email === user.email).map(a => (
                          <Button
                            key={a.id}
                            size="sm"
                            onClick={() => deleteAssignmentMutation.mutate(a.id)}
                            className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs"
                            variant="ghost"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Remove coach assignment
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Delete user */}
                    {user.role !== 'admin' && (
                      <div className="flex justify-end pt-2 border-t border-white/10">
                        <Button
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete ${user.email}? This cannot be undone.`)) {
                              deleteUserMutation.mutate(user);
                            }
                          }}
                          disabled={deleteUserMutation.isPending}
                          className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs"
                          variant="ghost"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete user
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* People from Notes (no account yet) */}
        {notePeople.length > 0 && (
          <div className="mt-8">
            <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4" /> People from Notes (no account yet)
            </h2>
            <div className="space-y-3">
              {notePeople.map(person => {
                const uniqueWords = [...new Set(person.allWords)];
                return (
                  <div key={person.name} className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold">👤 {person.name}</h3>
                      <span className="text-yellow-300/60 text-xs">{person.notes.length} note(s)</span>
                    </div>
                    {uniqueWords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {uniqueWords.map((w, i) => (
                          <span key={i} className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full">{w}</span>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1">
                      {person.notes.map(note => (
                        <div key={note.id} className="bg-white/5 rounded-lg p-2 flex items-start justify-between gap-2">
                          <p className="text-white/70 text-sm flex-1">{note.note}</p>
                          <button onClick={() => deleteNoteMutation.mutate(note.id)} className="text-white/20 hover:text-red-400 transition-colors">
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

      {/* Questionnaire Modal */}
      <Dialog open={!!viewingQuestionnaire} onOpenChange={() => setViewingQuestionnaire(null)}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-400" />
              Questionnaire — {viewingQuestionnaire?.first_name || viewingQuestionnaire?.email}
            </DialogTitle>
          </DialogHeader>
          {viewingQuestionnaire && (
            <div className="space-y-3 mt-2">
              {[
                { label: 'Language', value: viewingQuestionnaire.language },
                { label: 'Current Level', value: viewingQuestionnaire.current_level },
                { label: 'Goal Level', value: viewingQuestionnaire.goal_level },
                { label: 'Motivation', value: viewingQuestionnaire.motivation },
                { label: 'Why Important', value: viewingQuestionnaire.why_important },
                { label: 'Frustration', value: viewingQuestionnaire.frustration },
                { label: 'Tried Before', value: viewingQuestionnaire.tried_before },
                { label: "Why Didn't Work", value: viewingQuestionnaire.why_didnt_work },
                { label: 'Learning Duration', value: viewingQuestionnaire.learning_duration },
                { label: 'Fluency Impact', value: viewingQuestionnaire.fluency_impact },
                { label: 'Why Now', value: viewingQuestionnaire.why_now },
                { label: 'Ready to Commit', value: viewingQuestionnaire.ready_to_commit },
                { label: 'Daily Time', value: viewingQuestionnaire.daily_time },
                { label: 'Ready to Move', value: viewingQuestionnaire.ready_to_move },
                { label: 'Phone', value: viewingQuestionnaire.phone },
                { label: 'Email', value: viewingQuestionnaire.email },
              ].filter(row => row.value).map(row => (
                <div key={row.label} className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-white/40 text-xs mb-0.5">{row.label}</p>
                  <p className="text-white text-sm">{row.value}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle>Assign Coach to Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Coach</label>
              <select value={selectedCoach} onChange={(e) => setSelectedCoach(e.target.value)} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                <option value="">Select coach...</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.email}>{user.email} {user.role === 'admin' ? '(Admin)' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Student</label>
              <select value={selectedStudent} onChange={(e) => { setSelectedStudent(e.target.value); setStudentEmailInput(""); }} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white mb-2">
                <option value="">Select existing user...</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.email}>{user.email}</option>
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
                <p className="text-amber-400 text-xs mt-1">✉️ New user — account will be created automatically.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAssignDialog(false)} variant="outline" className="flex-1 border-white/20 text-white">Cancel</Button>
              <Button onClick={handleAssign} disabled={createAssignmentMutation.isPending} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500">Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}