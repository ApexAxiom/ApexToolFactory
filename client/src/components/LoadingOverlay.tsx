import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface LoadingOverlayProps {
  visible: boolean;
}

export default function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("Starting analysis...");
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    "Starting analysis...",
    "Processing uploaded files...",
    "Extracting text from resumes...",
    "Building candidate profiles...",
    "Checking for duplicates...",
    "Sending to AI for analysis...",
    "AI comparing skills and experience...",
    "Ranking candidates...",
    "Generating detailed insights...",
    "Finalizing results..."
  ];

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      setStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        // Cap at 95% to prevent reaching 100% before actual completion
        const maxProgress = 95;
        const newProgress = Math.min(prev + Math.random() * 15, maxProgress);
        
        // Update step based on progress
        const newStepIndex = Math.min(
          Math.floor((newProgress / 100) * steps.length),
          steps.length - 1
        );
        
        if (newStepIndex !== stepIndex) {
          setStepIndex(newStepIndex);
          setCurrentStep(steps[newStepIndex]);
        }
        
        return newProgress;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [visible, stepIndex, steps]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-lg mx-4">
        <div className="text-center mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            AI Resume Analysis in Progress
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Professional recruiter-level candidate evaluation
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Current Step:
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm pl-5">
              {currentStep}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="w-full h-2" />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              What's happening behind the scenes:
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Extracting candidate information and skills</li>
              <li>• Matching qualifications against job requirements</li>
              <li>• Scoring technical fit and growth potential</li>
              <li>• Identifying standout candidates and underdogs</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Analysis typically takes 30-90 seconds depending on file count
          </p>
        </div>
      </div>
    </div>
  );
}
