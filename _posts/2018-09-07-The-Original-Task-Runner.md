---
tags: Bash
comments: true
---

It seems to me that the tools we use are <mark>changing so quickly</mark> that
sometimes we <mark>forget to look around</mark> at what we already have before
we invent something new.  Don't get me wrong, specialised build tools and task
runners have their place and can make things easier, but they can *sometimes*
<mark>unnecessarily overcomplicate things</mark>.

> Simplicity is prerequisite for reliability. <cite>[Edsger
> Dijkstra][dijkstra]</cite>

Enter [Bash][bash]; installed on most Linux distributions by default, available
on Mac and [even Windows][wsl]. <mark>Cross platform!</mark>

People have been using Bash scripts to do this sort of thing for quite a while
now, but hopefully this will put a slightly different spin on it.

<!-- more -->

The `$@` Parameter
------------------

`$@` is a special Bash parameter. Here's a snippet from the Bash man pages:

> Expands to the positional parameters, starting from one. [...]  When there
> are no positional parameters, "$@" and $@ expand to nothing (i.e., they are
> removed) <cite>"Bash" man pages</cite>

Before we jump into why this is relevant, try running the following commands:

```bash
bash-4.4$ FOO=ls
bash-4.4$ $FOO -a /tmp/test
.  ..
bash-4.4$
```

Whats happening? Let's take a look with tracing turned on.

<aside>
We can use `set -x` to turn tracing on:

> The shell shall write to standard error a trace for each command after it
> expands the command and before it executes it. <cite>"set" man pages</cite>

Stick it at the top of your script for verbose output or just run `bash -x
script.sh`.
</aside>

```bash
bash-4.4$ set -x
bash-4.4$ FOO=ls
+ FOO=ls
bash-4.4$ $FOO -a /tmp/test
+ ls -a /tmp/test
.  ..
bash-4.4$
```

As you can see, the `$FOO` variable is expanded into `ls` and then it's
executed.

Now, lets get back on track and take a closer look at `$@`. We'll do a similar
thing as above, but with `$@` instead. This time, we can't *directly* set `$@`,
as it <q>expands to the positional parameters</q>, so we'll create a simple
script containing the following:

```bash
echo $@
$@
```

Yep, that's it... so lets run it: `bash -xv script.sh echo Hello`.

<aside>
Another useful Bash flag is `-v` (can also be turned on with `set -v`):

> The shell shall write its input to standard error as it is read. <cite>Set
> man pages</cite>

This will help us see what's about to be run inside our script.
</aside>

```bash
bash-4.4$ bash -xv script.sh echo Hello
echo $@
+ echo echo Hello
echo Hello
$@
+ echo Hello
Hello
bash-4.4$
```

You can see that our initial `echo $@` was expanded to `echo echo Hello` (as
`$@` contains `echo Hello`), but more interestingly, the line `$@` on it's own
was expanded to `echo Hello`, the first "word" (`echo`) was treated as the
command (as nothing preceded it) and everything else was treated as arguments.

Practical Use
-------------

With this knowledge, we can do some really cool things, like defining functions
within our script that we can call externally:

```bash
function speak()
{
	echo "Hello :)"
}

$@
```

<aside>
Make sure you `chmod` your script if you want to run it with `./`:

```bash
chmod u+x script.sh
```
</aside>

Run `./script.sh speak` and we get:

```bash
Hello :)
```

Why? Well, let's see, we'll run it with `bash -xv` to find out:

```bash
bash-4.4$ bash -xv script.sh speak
function speak()
{
	echo "Hello :)"
}

$@
+ speak
+ echo 'Hello :)'
Hello :)
bash-4.4$
```

Just after the function, you can see the expansion from `$@` to `speak`, which
in turn runs `echo 'Hello :)'`.

### Something More Complex?

How about a build tool with set up and tear down functionality?

```bash
function set_up()
{
	echo "Setting up..."
}

function tear_down()
{
	echo "Tearing down..."
}

function something()
{
	set_up
	echo "Doing something..."
	tear_down
}

$@
```

Let's abstract this further:

<aside>
`$@` works the same way for functions as it does for scripts.  Run with `bash
-xv` to see for yourself!
</aside>

```bash
function set_up()
{
	echo "Setting up..."
}

function tear_down()
{
	echo "Tearing down..."
}

function wrap()
{
	set_up
	$@
	tear_down
}

function something()
{
	wrap echo "Doing something..."
}

$@
```

### Default Command?

What about having a function execute automatically if no parameters are given
on the command line?

<aside>
`${@:-something}` checks if `$@` is <q>unset or null</q> and substitutes
`something` if it is.

> ${parameter:-word}
>
> Use Default Values.  If parameter is unset or null, the expansion of word is
> substituted.  Otherwise, the value of parameter is substituted. <cite>Bash
> man pages</cite>
</aside>

```bash
function something()
{
	echo "Doing something..."
}

function another()
{
	echo "Doing another..."
}

${@:-another}
```

`another` is now our default.

### Passing Parameters to Functions

How about passing parameters in to functions...

```bash
function greet()
{
	echo "Hello there $1"
}

$@
```

Run with `./script.sh greet Alice` to get:

```bash
Hello there Alice
```

Required parameters?

```bash
function greet()
{
	[[ -z "$1" ]] && echo 'Please provide a name ($1)' && exit 1

	echo "Hello there $1"
}

$@
```

Looking Like a Pro
------------------

If you're going to use this on a daily basis, typing `./script.sh` is
probably going to get tiresome quite quickly, so here's a couple of ideas to
help:

 - Call the script something **short and relevant** like `do`, you don't need the
   `.sh` extension.
 - Add an alias (`alias do=./do`) in your `.bashrc` file, so you can just type
   `do` rather than `./do`.


[dijkstra]: https://en.wikipedia.org/wiki/Edsger_W._Dijkstra
[bash]: https://www.gnu.org/software/bash/
[wsl]: https://docs.microsoft.com/en-us/windows/wsl/about
