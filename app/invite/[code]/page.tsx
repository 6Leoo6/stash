import { JoinForm } from "./join-form";

type Props = { params: Promise<{ code: string }> };

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  return <JoinForm code={code} />;
}
