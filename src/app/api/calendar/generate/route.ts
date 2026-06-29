import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, month, year, categoryId, count } = await req.json();

    if (!clientId || !month || !year) {
      return NextResponse.json({ error: "clientId, month, and year are required" }, { status: 400 });
    }

    const numEntries = count || 5;
    const postTypes = ["POSTER", "REEL", "VIDEO", "CAROUSEL", "STORY", "STATIC"];
    const platforms = ["instagram", "facebook", "linkedin", "twitter", "youtube"];

    const generateEntries = Array.from({ length: numEntries }, (_, i) => {
      const day = Math.min((i + 1) * 5, 28);
      const postingDate = new Date(parseInt(year), parseInt(month) - 1, day);

      return {
        clientId,
        categoryId: categoryId || null,
        title: `AI Generated Post ${i + 1}`,
        description: `Automatically generated social media post for ${month}/${year}`,
        postType: postTypes[Math.floor(Math.random() * postTypes.length)],
        platform: [platforms[Math.floor(Math.random() * platforms.length)]],
        postingDate: postingDate.toISOString(),
        creativeBrief: `Creative brief for AI generated post ${i + 1}. Focus on engaging content.`,
        caption: `Check out our latest update! #post${i + 1} #ai #generated`,
        hashtags: ["ai", "generated", "social", "content"],
        designDirection: "Modern and clean design with brand colors",
        referenceLinks: [],
      };
    });

    return NextResponse.json({ entries: generateEntries });
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate calendar entries" }, { status: 500 });
  }
}
