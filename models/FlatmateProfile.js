import mongoose from 'mongoose';

const FlatmateProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userEmail: { type: String, required: false },
  name: { type: String, required: true },
  photoUrl: { type: String, required: false },
  gender: { type: String, required: true },
  age: { type: Number, required: true },
  occupation: { type: String, required: true },
  hometown: { type: String, required: true },
  languages: { type: [String], required: true },
  foodPreference: { type: String, required: true },
  socialPreference: { type: String, required: true },
  hobbies: { type: [String], required: false },
  workMode: { type: String, required: true },
  relationshipStatus: { type: String, required: false },
  musicPreference: { type: String, required: false },
  guestPolicy: { type: String, required: true },
  wakeupTime: { type: String, required: false },
  bedtime: { type: String, required: false },
  preferredGender: { type: String, required: true },
  budget: { type: Number, required: true },
  locationPreference: { type: String, required: true },
  habits: {
    smoking: { type: String, required: true },
    pets: { type: String, required: true },
    sleepTime: { type: String, required: true },
    cleanliness: { type: String, required: true }
  },
  bio: { type: String, required: true }
});

const FlatmateProfile = mongoose.model('FlatmateProfile', FlatmateProfileSchema);
export default FlatmateProfile;
