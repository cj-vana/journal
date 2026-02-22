import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user only if env vars are set (for automated/Docker deployments)
  // If env vars are not set, the setup wizard will handle admin creation
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: process.env.ADMIN_NAME || 'Admin',
          passwordHash,
          role: 'admin',
          avatarColor: '#F4A0A8',
        },
      })
      console.log(`Admin user created: ${adminEmail}`)
    }
  } else {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD set - admin will be created via setup wizard')
  }

  // Create debug user if debug mode enabled
  if (process.env.ENABLE_DEBUG_PROFILE === 'true') {
    const debugEmail = 'chaos-test@debug.local'
    const existing = await prisma.user.findUnique({ where: { email: debugEmail } })
    if (!existing) {
      const passwordHash = await bcrypt.hash('debug123', 12)
      await prisma.user.create({
        data: {
          email: debugEmail,
          name: 'Chaos Tester',
          passwordHash,
          role: 'admin',
          avatarColor: '#B08CE0',
        },
      })
      console.log('Debug user created')
    }
  }

  // Create default tags
  const tags = [
    { name: 'Funny Moments', color: '#F4A0A8', icon: '😂' },
    { name: 'Advice', color: '#7BB4E8', icon: '💡' },
    { name: 'Memories', color: '#B08CE0', icon: '💭' },
    { name: 'Milestones', color: '#8CB88C', icon: '⭐' },
    { name: 'Letters', color: '#D9C4A0', icon: '✉️' },
    { name: 'Daily Life', color: '#F4A0A8', icon: '🏠' },
    { name: 'Firsts', color: '#8CB88C', icon: '🎉' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
  }
  console.log('Default tags created')

  // Create writing prompts
  const prompts = [
    { text: 'What made you laugh this week?', category: 'humor' },
    { text: 'Describe a moment you never want to forget.', category: 'memory' },
    { text: 'What advice would you give your child about friendship?', category: 'advice' },
    { text: 'What song reminds you of this time?', category: 'memory' },
    { text: 'Describe what your life looks like right now.', category: 'reflection' },
    { text: 'What are you most grateful for today?', category: 'reflection' },
    { text: 'What do you hope they inherit from you?', category: 'love' },
    { text: 'Write about a family tradition you want to start.', category: 'reflection' },
    { text: 'What was the best part of today?', category: 'reflection' },
    { text: 'Describe how your home feels right now.', category: 'memory' },
    { text: 'What book are you reading to your little one?', category: 'memory' },
    { text: 'What do you want them to know about where they come from?', category: 'advice' },
    { text: 'Describe their laugh.', category: 'love' },
    { text: 'What surprised you about parenthood this week?', category: 'reflection' },
    { text: 'Write a letter to their future self.', category: 'love' },
    { text: 'What is their favorite thing right now?', category: 'memory' },
    { text: 'Describe a typical day together.', category: 'memory' },
    { text: 'What lesson did they teach you recently?', category: 'reflection' },
    { text: 'What are you looking forward to?', category: 'reflection' },
    { text: 'Write about a time they made everyone smile.', category: 'humor' },
    { text: 'What does love feel like right now?', category: 'love' },
    { text: 'Describe the weather and the season.', category: 'memory' },
    { text: 'What is your favorite nickname for your child?', category: 'love' },
    { text: 'What do you want to remember about this age?', category: 'memory' },
    { text: 'Write about someone who loves them deeply.', category: 'love' },
    { text: 'What was the funniest thing they did today?', category: 'humor' },
    { text: 'What values are most important to teach your child?', category: 'advice' },
    { text: 'Describe their eyes.', category: 'love' },
    { text: 'What are your hopes for their first day of school?', category: 'reflection' },
    { text: 'Write about a challenge you overcame together.', category: 'reflection' },
    { text: 'What does their room look like?', category: 'memory' },
    { text: 'Describe a meal you shared together.', category: 'memory' },
    { text: 'What music do they respond to?', category: 'memory' },
    { text: 'Write about a person they should know about.', category: 'advice' },
    { text: 'What do you dream about for their future?', category: 'love' },
    { text: 'Describe the view from your window.', category: 'memory' },
    { text: 'What would you tell your past self about becoming a parent?', category: 'advice' },
    { text: 'Write about something new they learned.', category: 'memory' },
    { text: 'What makes them unique?', category: 'love' },
    { text: 'Describe a quiet moment you cherish.', category: 'love' },
    { text: 'What are you worried about right now?', category: 'reflection' },
    { text: 'Write about their grandparents.', category: 'memory' },
    { text: 'What game do they love to play?', category: 'memory' },
    { text: 'Describe bedtime.', category: 'memory' },
    { text: 'What do you want them to know about hard times?', category: 'advice' },
    { text: 'Write about a place that is special to your family.', category: 'memory' },
    { text: 'What is the most beautiful thing about being a parent?', category: 'love' },
    { text: 'Describe the first time you held them.', category: 'love' },
    { text: 'What do you want them to know about kindness?', category: 'advice' },
    { text: 'Write about a silly face they make.', category: 'humor' },
    { text: 'What do they smell like after a bath?', category: 'love' },
    { text: 'Describe the sound of the house right now.', category: 'memory' },
    { text: 'What pet name does the family use for your little one?', category: 'humor' },
    { text: 'Write about something that changed since they arrived.', category: 'reflection' },
  ]

  const existingCount = await prisma.writingPrompt.count()
  if (existingCount === 0) {
    await prisma.writingPrompt.createMany({ data: prompts })
    console.log(`${prompts.length} writing prompts created`)
  }

  // Create AppSettings singleton
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      childName: 'Baby',
      appTitle: 'Our Journal',
      theme: 'warm',
    },
  })
  console.log('App settings initialized')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
