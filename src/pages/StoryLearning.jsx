import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import GameHeader from "../components/game/GameHeader";

import Step1Immersion from "../components/story/Step1Immersion";
import Step2Supported from "../components/story/Step2Supported";
import Step3Vocab from "../components/story/Step3Vocab";
import Step4Practice from "../components/story/Step4Practice";
import Step5Conversation from "../components/story/Step5Conversation";
import Step6Song from "../components/story/Step6Song";

export default function StoryLearning() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const storyId = searchParams.get("story");

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.list();
      return profiles[0] || null;
    },
  });

  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      const stories = await base44.entities.Story.filter({ story_id: storyId });
      return stories[0] || null;
    },
    enabled: !!storyId,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['storyProgress', storyId],
    queryFn: async () => {
      const progresses = await base44.entities.UserStoryProgress.filter({ story_id: storyId });
      if (progresses.length > 0) return progresses[0];
      
      // Create initial progress
      return await base44.entities.UserStoryProgress.create({
        story_id: storyId,
        current_step: 1,
        step1_completed: false,
        step2_completed: false,
        step3_completed: false,
        step4_completed: false,
        step5_completed: false,
        step6_completed: false,
        story_completed: false,
        words_added_to_backpack: []
      });
    },
    enabled: !!storyId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserStoryProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyProgress'] });
    },
  });

  const handleStepComplete = async (stepNumber, stepData = {}) => {
    if (!progress) return;

    const updates = {
      [`step${stepNumber}_completed`]: true,
      current_step: Math.min(6, stepNumber + 1),
      ...stepData
    };

    // Check if story is complete
    if (stepNumber === 5) {
      updates.story_completed = true;
    }

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: updates
    });
  };

  if (!storyId || storyLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <GameHeader profile={userProfile} coins={0} onBuyCoins={() => {}} />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-white/60">Story not found</p>
        </div>
      </div>
    );
  }

  const currentStep = progress?.current_step || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <GameHeader profile={userProfile} coins={0} onBuyCoins={() => {}} />
      
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(createPageUrl("BabyVideos"))}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{story.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    step < currentStep
                      ? "bg-green-500"
                      : step === currentStep
                      ? "bg-cyan-500"
                      : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {currentStep === 1 && (
            <Step1Immersion 
              story={story} 
              onComplete={(rating) => handleStepComplete(1, { step1_comprehension_rating: rating })}
            />
          )}
          {currentStep === 2 && (
            <Step2Supported 
              story={story}
              progress={progress}
              onComplete={() => handleStepComplete(2)}
              onWordAdd={(word) => {
                const updated = [...(progress.words_added_to_backpack || []), word];
                updateProgressMutation.mutate({
                  id: progress.id,
                  data: { words_added_to_backpack: updated }
                });
              }}
            />
          )}
          {currentStep === 3 && (
            <Step3Vocab 
              story={story}
              progress={progress}
              onComplete={() => handleStepComplete(3)}
            />
          )}
          {currentStep === 4 && (
            <Step4Practice 
              story={story}
              onComplete={() => handleStepComplete(4)}
            />
          )}
          {currentStep === 5 && (
            <Step5Conversation 
              story={story}
              onComplete={() => handleStepComplete(5)}
            />
          )}
          {currentStep === 6 && (
            <Step6Song 
              story={story}
              onComplete={() => {
                handleStepComplete(6);
                navigate(createPageUrl("BabyVideos"));
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}