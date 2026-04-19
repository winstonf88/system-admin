"use client";
import UserEditModal from "@/components/users/UserEditModal";
import type { UserRow } from "@/components/users/user-types";
import { useModal } from "@/hooks/useModal";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import AvatarText from "@/components/ui/avatar/AvatarText";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export type AuthSessionClient = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
};

function sessionToUserRow(session: AuthSessionClient): UserRow {
  return {
    id: session.id,
    email: session.email,
    first_name: session.first_name,
    last_name: session.last_name,
    is_active: session.is_active,
  };
}

function displayName(session: AuthSessionClient): string {
  const parts = [session.first_name, session.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return session.email.split("@")[0] ?? session.email;
}

function avatarLabel(session: AuthSessionClient): string {
  const parts = [session.first_name, session.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return session.email;
}

export default function UserDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<AuthSessionClient | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const editProfileModal = useModal();
  const [profileEditUser, setProfileEditUser] = useState<UserRow | null>(null);

  const refreshSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (res.ok) {
        setSession((await res.json()) as AuthSessionClient);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (cancelled) {
          return;
        }
        if (res.ok) {
          setSession((await res.json()) as AuthSessionClient);
        } else {
          setSession(null);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setSessionLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function openEditProfile() {
    closeDropdown();
    if (!session) {
      return;
    }
    setProfileEditUser(sessionToUserRow(session));
    editProfileModal.openModal();
  }

  async function signOut() {
    closeDropdown();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/signin");
    router.refresh();
  }

  const emailLine = session?.email ?? "";

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="dropdown-toggle flex items-center gap-1 text-gray-700 dark:text-gray-400"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menu da conta"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {session ? (
            <AvatarText name={avatarLabel(session)} />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {sessionLoaded ? "?" : "…"}
            </span>
          )}
        </span>

        <svg
          className={`shrink-0 stroke-gray-500 transition-transform duration-200 dark:stroke-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-1">
          <span className="block truncate font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {session ? displayName(session) : sessionLoaded ? "Sessão iniciada" : "Carregando…"}
          </span>
          {emailLine ? (
            <span className="mt-0.5 block truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {emailLine}
            </span>
          ) : null}
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pt-4 pb-3 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={openEditProfile}
              className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-gray-700 group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <svg
                className="fill-gray-500 group-hover:fill-gray-700 dark:fill-gray-400 dark:group-hover:fill-gray-300"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z"
                  fill=""
                />
              </svg>
              Editar perfil
            </DropdownItem>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-gray-700 group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <svg
            className="fill-gray-500 group-hover:fill-gray-700 dark:group-hover:fill-gray-300"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z"
              fill=""
            />
          </svg>
          Sair
        </button>
      </Dropdown>

      <UserEditModal
        user={profileEditUser}
        isOpen={editProfileModal.isOpen}
        onClose={() => {
          editProfileModal.closeModal();
          setProfileEditUser(null);
        }}
        onSaved={async () => {
          router.refresh();
          await refreshSession();
        }}
        title="Editar perfil"
        description="Atualize os dados da sua conta. Deixe a senha em branco para manter a senha atual."
      />
    </div>
  );
}
