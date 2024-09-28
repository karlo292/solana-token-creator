/** @type {import('tailwindcss').Config} */
module.exports = {
  // Update the content array to include paths to all of your template files
  content: [
    "./views/**/*.ejs", // Path to your EJS templates
    "./public/**/*.js", // Any JavaScript files in your public directory
    "./public/**/*.html", // If you have any plain HTML files
  ],
  theme: {
    extend: {
      // Extend Tailwind's default theme here
      // For example, adding custom colors or fonts
      colors: {
        'custom-blue': '#007bff', // Example custom color
      },
    },
  },
  plugins: [
    // Add any plugins here
  ],
}