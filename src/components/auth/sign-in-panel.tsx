type SignInPanelProps = {
  githubAction: () => Promise<void>;
  /** Present only when the non-production test login is enabled. */
  testLoginAction?: (formData: FormData) => Promise<void>;
  error?: string;
};

const TEST_LOGINS = ["e2e-engineer", "e2e-lead"] as const;

const buttonClass =
  "w-full rounded-[9px] px-3 py-2.5 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f6b442]";

export function SignInPanel({ githubAction, testLoginAction, error }: SignInPanelProps) {
  return (
    <section className="w-full max-w-sm rounded-[14px] border border-[#dde5f0] bg-white p-7 shadow-[0_4px_12px_#1a3a6910]">
      <p className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
        <span aria-hidden="true" className="rounded-lg bg-[#2459d3] px-2 py-1 text-white">
          ✦
        </span>
        SupportPilot
      </p>
      <h1 className="text-2xl font-bold tracking-tight">Sign in to SupportPilot</h1>
      <p className="mt-1.5 text-sm text-[#75839a]">
        For support engineers investigating payments and webhooks.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-[#fdecec] px-3 py-2 text-sm text-[#a32424]">
          Sign-in failed. Please try again.
        </p>
      ) : null}

      <form action={githubAction} className="mt-6">
        <button type="submit" className={`${buttonClass} bg-[#182539] text-white hover:bg-[#24344d]`}>
          Continue with GitHub
        </button>
      </form>

      {testLoginAction ? (
        <div className="mt-6 border-t border-[#e1e7f0] pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7c8aa2]">Test login (non-production)</p>
          {TEST_LOGINS.map((login) => (
            <form key={login} action={testLoginAction} className="mt-2">
              <input type="hidden" name="login" value={login} />
              <button
                type="submit"
                aria-label={`Sign in as test user: ${login}`}
                className={`${buttonClass} border border-[#dde5f0] bg-[#fbfcff] text-[#1748a3] hover:bg-[#e7eefc]`}
              >
                {login}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  );
}
