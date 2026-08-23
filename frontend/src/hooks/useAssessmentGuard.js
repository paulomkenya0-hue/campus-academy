import { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

/**
 * Anti-cheating for assessment-mode quizzes (spec sections 15-16).
 * We're explicit that this makes cheating HARDER and logs suspicious
 * behavior — it can never fully prevent it in a browser.
 */
export function useAssessmentGuard({ active, courseId, stageId, topicId, timeLimitSeconds, onAutoSubmit }) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds || null);
  const [violationCount, setViolationCount] = useState(0);
  const [warning, setWarning] = useState("");
  const autoSubmittedRef = useRef(false);

  // Timer countdown + auto-submit on expiry
  useEffect(() => {
    if (!active || !timeLimitSeconds) return;
    setSecondsLeft(timeLimitSeconds);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            setWarning("⏰ Muda umeisha. Jibu lako linawasilishwa kiotomatiki.");
            onAutoSubmit();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, timeLimitSeconds]);

  // Tab-switch / window-blur detection
  useEffect(() => {
    if (!active) return;

    async function logEvent(type) {
      try {
        const logFn = httpsCallable(functions, "logSuspiciousEvent");
        const { data } = await logFn({ courseId, stageId, topicId, type });
        setViolationCount(data.violationCount);
        setWarning("⚠️ Umeondoka kwenye ukurasa wa mtihani. Tukio hili limehifadhiwa.");

        if (data.violationCount >= 3 && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          setWarning("🚫 Umefikia kikomo cha matukio ya kutiliwa shaka. Jibu lako linawasilishwa kiotomatiki.");
          onAutoSubmit();
        }
      } catch {
        // Never block the student's exam flow if logging fails.
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) logEvent("tab_switch");
    }
    function handleBlur() {
      logEvent("window_blur");
    }
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [active, courseId, stageId, topicId]);

  return { secondsLeft, violationCount, warning };
}

export function formatTime(seconds) {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
