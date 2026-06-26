import { FormEvent, useState } from "react";
import { addDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Shield, ShieldOff, Plus, X } from "lucide-react";
import { getDb, membersCollection } from "../../lib/firebaseData";
import type { Member } from "../../types/domain";

type MemberManagerProps = {
  members: Member[];
  onPick: (id: string) => void;
};

export function MemberManager({ members, onPick }: MemberManagerProps) {
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
    await updateDoc(doc(getDb(), "members", member.id), {
      active: false,
      updatedAt: serverTimestamp(),
    });
  }

  async function toggleAdmin(member: Member) {
    await updateDoc(doc(getDb(), "members", member.id), {
      admin: !member.admin,
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

      <div className="member-list">
        {activeMembers.map((member) => (
          <div className="member-row" key={member.id}>
            <button className="text-button" type="button" onClick={() => onPick(member.id)}>
              {member.name}
              {member.admin ? <span className="role-pill">Admin</span> : null}
            </button>
            <button
              className="icon-button"
              type="button"
              title={member.admin ? "Remove admin" : "Make admin"}
              onClick={() => toggleAdmin(member)}
            >
              {member.admin ? <ShieldOff size={17} /> : <Shield size={17} />}
            </button>
            <button
              className="icon-button danger"
              type="button"
              title="Remove member"
              onClick={() => deactivate(member)}
            >
              <X size={17} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
