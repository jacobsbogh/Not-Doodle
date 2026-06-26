import { FormEvent, useState } from "react";
import { addDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Plus, X } from "lucide-react";
import { getDb, membersCollection } from "../../lib/firebaseData";
import type { Member } from "../../types/domain";

type MemberManagerProps = {
  adminUnlocked: boolean;
  members: Member[];
  onPick: (id: string) => void;
};

export function MemberManager({
  adminUnlocked,
  members,
  onPick,
}: MemberManagerProps) {
  const [name, setName] = useState("");
  const activeMembers = members.filter((member) => member.active !== false);
  const inactiveMembers = members.filter((member) => member.active === false);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const existingInactive = inactiveMembers.find(
      (member) => member.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (existingInactive) {
      await updateDoc(doc(getDb(), "members", existingInactive.id), {
        active: true,
        updatedAt: serverTimestamp(),
      });
      onPick(existingInactive.id);
    } else {
      const created = await addDoc(membersCollection(), {
        name: trimmed,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onPick(created.id);
    }

    setName("");
  }

  async function deactivate(member: Member) {
    if (!adminUnlocked) {
      return;
    }

    await updateDoc(doc(getDb(), "members", member.id), {
      active: false,
      updatedAt: serverTimestamp(),
    });
  }

  return (
    <section className="panel form-stack">
      <h2>Members</h2>
      <form className="search-row" onSubmit={addMember}>
        <label>
          Add member
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            required
          />
        </label>
        <button className="primary" type="submit">
          <Plus size={18} />
          Add
        </button>
      </form>

      {!adminUnlocked && (
        <div className="admin-lock-card">
          <div className="section-title">
            <h3>Admin access</h3>
            <span>Unlock Admin tools above to remove people</span>
          </div>
        </div>
      )}

      <div className="member-list">
        {activeMembers.map((member) => (
          <div className="member-row" key={member.id}>
            <button className="text-button" type="button" onClick={() => onPick(member.id)}>
              {member.name}
            </button>
            {adminUnlocked && (
              <button
                className="icon-button danger"
                type="button"
                title="Remove member"
                onClick={() => deactivate(member)}
              >
                <X size={17} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
