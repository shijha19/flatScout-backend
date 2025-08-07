// KMeans and compatibility scoring for flatmate profiles
// This is a simple, in-memory implementation for demonstration

function encodeProfile(profile) {
  // Convert categorical fields to numbers for clustering
  return [
    profile.gender === 'Male' ? 0 : 1,
    profile.preferredGender === 'Male' ? 0 : profile.preferredGender === 'Female' ? 1 : 2,
    Number(profile.budget) || 0,
    profile.habits.smoking === 'Yes' ? 1 : 0,
    profile.habits.pets === 'Yes' ? 1 : 0,
    profile.habits.sleepTime === 'Late' ? 1 : 0,
    profile.habits.cleanliness === 'High' ? 2 : profile.habits.cleanliness === 'Medium' ? 1 : 0
  ];
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export function kmeansMatchAndScore(userProfile, allProfiles) {
  // For demo: just compute distance to user and invert for compatibility
  const userVec = encodeProfile(userProfile);
  const matches = allProfiles.map(profile => {
    const vec = encodeProfile(profile);
    const dist = euclidean(userVec, vec);
    // Compatibility: higher is better, 0-100
    const compatibility = Math.max(0, 100 - dist * 20);
    return { ...profile.toObject(), compatibility: Math.round(compatibility) };
  });
  // Sort by compatibility descending
  matches.sort((a, b) => b.compatibility - a.compatibility);
  return matches;
}
