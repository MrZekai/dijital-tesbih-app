import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import { nativeApplicationVersion } from "expo-application";
import { AppState, Platform } from "react-native";
import { createReviewPolicy } from "./goalReviewPolicy";
import { beginGoalSurface, endGoalSurface } from "../ads/userActivity";

type Actions = {
  prepareReview(): Promise<boolean>;
  launchReview(): Promise<void>;
  shareGoalCard(name: string, count: string, appName: string, chooserTitle: string, link: string): Promise<void>;
};
const native = Platform.OS === "android" ? requireOptionalNativeModule<Actions>("GoalActions") : null;
const policy = createReviewPolicy(AsyncStorage);

export function startGoalSession() {
  if (native) void policy.startSession().catch(() => {});
}

export function recordCompletedGoal() {
  if (native) void policy.completeGoal().catch(() => {});
}

export const GOAL_CARD_URL = "https://play.google.com/store/apps/details?id=com.zikirhane.tesbih&referrer=utm_source%3Dshare_card";

export async function shareGoalCard(name: string, count: string, appName: string, chooserTitle: string) {
  if (!native) return;
  await native.shareGoalCard(name, count, appName, chooserTitle, GOAL_CARD_URL);
}

export async function maybeReviewAtBreak(eligible: () => boolean) {
  const safe = () => eligible() && AppState.currentState === "active";
  if (!native || !safe() || !beginGoalSurface()) return;
  try {
    if (await policy.reserve(nativeApplicationVersion ?? "", safe) && safe() &&
        await native.prepareReview() && safe()) await native.launchReview();
  } catch {
    // Play, storage or the current distribution can be unavailable. Counting continues.
  } finally {
    endGoalSurface();
  }
}
