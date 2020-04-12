---
tags: Bash GPG
comments: true
---

There are a lot of different password managers out there, a lot of good ones,
but in one way or another, <mark>none of them quite hit the mark for me</mark>.
The closest thing I found was [Pass][pass], but even that didn't quite fit the
bill. It did inspire me to create my own though...

Introducing [SecureStore][securestore], a [Pass][pass]-like password manager.
Written in [Bash][bash] flavoured shell and using [GPG][gpg] to encrypt the
contents of the store. Looking at it from a high level, it's _very_ similar to
[Pass][pass], but <mark>there are some notable differences</mark> once you look
at it a little deeper.

<!-- more -->

This post _isn't_ an introduction, it assumes you're generally familiar with
the available functionality, so take a look at [the GitHub README.md][securestore]
for the installation guide and an overview of how to use it. This post focuses
on architecture, general design decisions and extendability.

Secure Foundations
------------------

[SecureStore][securestore]'s architecture takes a layered approach, with each
layer building on functionality from the last. [The foundational
layer][securestore_layer], named `securestore`, takes care of basic
functionality, providing helper methods and managing the GPG encryption. As with
all layers, it can be used without any of the layers above it, so in this
instance we can use it to create a simple encrypted store for any of your files.

The interface is designed around sub-commands, similar to `git`. Each
sub-command has a corresponding function, so there's function within
[`securestore`][securestore_layer] called `init` (that aliases `ss_init`), `add`
(that aliases `ss_add`), `remove` (that aliases `ss_remove`) and so on. As
mentioned, these functions alias prefixed versions of themselves in order to
allow higher layers of the software to override functionality provided by lower
layers <mark>without loosing access to said functionality</mark>.

The way sub-commands are created and how functionality is inherited is heavily
based off of one of my previous posts, [The Original Task
Runner][the_original_task_runner], so for a deeper understanding of what's going
on there, you might want to pause here and have a quick read.

Version Controlled
------------------

Next up is [the `vcstore` layer][vcstore_layer]. This builds on the foundations
created by the `securestore` layer and adds version control. We can access this
functionality by running `vcstore <sub-command>`.

Let's take a look at one of the sub-commands, `add`:

```bash
vcs_add() {
	ss_add "$@"

	vcs_git_add "$1"
	vcs_git_commit "Added '$1'"
}

add() { vcs_add "$@"; }
```

As you can see, `add` is aliased to `vcs_add` so that in higher layers, `add`
can be overridden. This provides a <mark>consistent and clean interface</mark>
to the user, but still allows access to the `vcs_add` functionality if `add` is
overwritten. In fact, we're overriding the `add` sub-command from the
`securestore` layer here, but still making use of it's functionality by calling
`ss_add`. Using this pattern, we can re-use existing functionality in lower
layers and then add our version control code on top.

Once again, `vcstore` can be used without any higher layers, so if you're after
an encrypted, version controlled note store, this would do the job nicely.

The Password Manager
--------------------

<aside>
Keep in mind that you can _trivially_ build a layer that sits on top of this to
add, alter or remove any functionality you desire. Everything is built with
extendability in mind, so make use of it!

[The codebase][securestore] is quite readable, so don't be scared to take a
look.
</aside>

The part you've all been waiting for, the password manager! Named `pass`, [this
layer][pass_layer] adds password manager functionality to the previous two
layers. All the usual sub-commands are still available to us, most haven't
changed from the `vcstore` layer, so we'll just look at the extra functionality
that's provided here.

This time, when you initialise a new store, it's automatically created in
`$HOME/pass` instead of the current directory, this means that no matter where
you are on your file system, you can run `pass <sub-command>` and it'll always
execute in the correct context.

In my opinion, the really cool thing about this layer is that <mark>every entry
is a valid Bash script</mark>. Let me give you an example:

<aside>
This file lives in `$HOME/pass/.template` and is used as a template for each
newly created entry.

`{PASSWORD}` is automatically substituted for a randomly generated password and
the `type` and `key` commands are helper functions defined by the `pass` layer
that allow you to send keys to the currently focused application.
</aside>

```bash
Username=""
Password="{PASSWORD}"

URL=""

AutoType() {
	type "$Username"
	key Tab
	type "$Password"
	key Return
}
```

Making every entry a valid Bash script allows us to do some really powerful
things. Let's take a look at the `get-property` sub-command:

```bash
#: $PROG get-property <entry_name> <property_name>
#: Print the value of the <property_name> stored in <entry_name> to stdout
pass_get_property() {
	ss_get "$1" > "$TMP_FILE"  # Get the file from the store
	source "$TMP_FILE"  # Load the file into the current context

	[ -z "$2" ] && ss_error "You must specify a property to retrieve"

	echo "${!2}"
}

get_property() { pass_get_property "$@"; }
```

As you can see, we actually `source` the entry within the function, this loads
all of the variables and functions in our entry into the current scope. After
that, the sky's the limit! You can use the `get-property`, `type-property`,
`copy-property`, `open-property` and the `run-function` sub-commands to access
and run anything in an entry.

You can even refer to properties in other entries by doing  something like this:

```bash
Password="$(pass get-property Other/Entry Password)"
```

What Next?
----------

To get you started, in [the git repository][securestore] there are some [example
integrations][integrations] demonstrating how you could use
[dmenu as a UI][dmenu_integration]. Or how to [run the correct `AutoType`
function][autotype_integration] depending on the currently focused window.

The rest is up to you, build new layers, extend the functionality, integrate it
into your workflow!


[pass]: https://www.passwordstore.org
[securestore]: https://github.com/vimist/securestore
[bash]: https://www.gnu.org/software/bash
[gpg]: https://gnupg.org
[dmenu]: https://tools.suckless.org/dmenu

[securestore_layer]: https://github.com/vimist/securestore/blob/master/securestore
[vcstore_layer]: https://github.com/vimist/securestore/blob/master/vcstore
[pass_layer]: https://github.com/vimist/securestore/blob/master/pass

[the_original_task_runner]: {% post_url 2018-09-07-The-Original-Task-Runner %}

[integrations]: https://github.com/vimist/securestore/tree/master/integrations

[dmenu_integration]: https://github.com/vimist/securestore/tree/master/integrations/pass_dmenu.sh
[autotype_integration]: https://github.com/vimist/securestore/tree/master/integrations/window_autotype.sh
