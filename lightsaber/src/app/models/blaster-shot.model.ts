import {BlasterShotComponent} from '../blaster-shot/blaster-shot'; // Keep this import if componentRef is used

export interface BlasterShot {
  id: string;
  currentX: number; // Current logical X position
  currentY: number; // Current logical Y position
  angleRadian: number; // Angle of the shot in radians
  componentRef?: BlasterShotComponent; // Keep a reference if needed
  hasBeenDeflected: boolean;
}
