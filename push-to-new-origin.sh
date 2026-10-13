#!/usr/bin/env bash
# Push main + feat/react-migration to the new mahendhar2004/Docsile-HMS repo.
# Run this yourself (not through Claude Code) — e.g. `! bash push-to-new-origin.sh`
# in the chat, or directly in a terminal.
set -euo pipefail
cd "$(dirname "$0")"

# Pin the account for this repo explicitly (already set, but made explicit here
# so this script is self-contained and not dependent on prior session state).
#
# NOTE: this must be the URL-scoped key (credential.https://github.com.helper),
# not the generic credential.helper. The global ~/.gitconfig unconditionally
# sets credential.https://github.com.helper = "!gh auth git-credential" (and
# that resolves to gh's *active* account, mahendharcampx) — since global config
# is read before local, a generic local credential.helper never even gets
# consulted; git stops at the first helper that returns a username+password.
# Setting the SAME url-scoped key locally (reset to empty, then the real
# value) makes this repo's local config win instead.
git config --local user.name "Mahendhar"
git config --local user.email "119279204+mahendhar2004@users.noreply.github.com"
git config --local --unset-all credential.helper 2>/dev/null || true
git config --local --unset-all credential.https://github.com.helper 2>/dev/null || true
git config --local --add credential.https://github.com.helper ""
git config --local --add credential.https://github.com.helper "store --file=.git/credentials-mahendhar2004"

git push -u origin main feat/react-migration

echo ""
echo "Pushed. Verifying remote branches:"
git ls-remote --heads origin
