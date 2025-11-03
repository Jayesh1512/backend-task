async function main() {
  console.log('Hello from TypeScript + Node.js!');
  console.log(`Node version: ${process.version}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
