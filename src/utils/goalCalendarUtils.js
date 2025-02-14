const lightColors = [
  [255, 182, 193], // Light Pink
  [255, 223, 186], // Peach
  [255, 239, 186], // Light Yellow
  [186, 255, 201], // Mint Green
  [186, 225, 255], // Soft Blue
  [200, 200, 255], // Lavender Blue
  [220, 186, 255], // Soft Purple
  [255, 186, 220], // Light Magenta
  [186, 255, 250], // Aqua Mint
  [240, 248, 255], // Alice Blue
  [230, 230, 250], // Lavender
  [250, 235, 215], // Antique White
  [255, 228, 225], // Misty Rose
  [255, 250, 205], // Lemon Chiffon
  [245, 245, 220], // Beige
  [255, 245, 238], // Seashell
  [240, 255, 240], // Honeydew
  [240, 255, 255], // Azure
  [230, 255, 250], // Pale Turquoise
  [255, 228, 181], // Moccasin
  [255, 218, 185], // Peach Puff
  [255, 239, 213], // Papaya Whip
  [255, 222, 173], // Navajo White
  [240, 230, 140], // Khaki
];

// Function to return only RGB values as a string
const getRGB = (r, g, b) => `rgb(${r}, ${g}, ${b})`;

// Function to generate a random light color in RGBA format
export const generateLightdivor = () => {
  const randomIndex = Math.floor(Math.random() * lightColors.length);
  const [r, g, b] = lightColors[randomIndex];
  return getRGB(r, g, b);
};

export const rgbStringToRgba = (rgbString, opacity) => {
  const match = rgbString.match(/\d+/g); // Extract numbers from "rgb(r, g, b)"
  if (!match || match.length !== 3) return null; // Validate input

  const [r, g, b] = match.map(Number);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const normalizeDate = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0); // Set time to midnight
  return newDate.getTime(); // Convert to timestamp for accurate comparison
};