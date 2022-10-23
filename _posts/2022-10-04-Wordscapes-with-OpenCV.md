---
title: Wordscapes with OpenCV
tags:
 - Python
 - Computer Vision
comments: true
---

I don't play a lot of games, but occasionally one catches my eye, usually
because it looks like something I could have fun automating.

This time, the game was [Wordscapes][wordscapes], <mark>a cross between scrabble
and a crossword</mark>. The aim is to find the words in the grid using a given
set of letters; each letter can only be used once, bonus points for extra words!

<!-- more -->

![Wordscapes Level 11]({% link /assets/posts/wordscapes-with-opencv/level_11.png %})

The mechanics of the game are _trivial_ to automate, we just need to find all
words that are only made up of the letters we have available. I'll spare you the
details, we're just programmatically searching through a dictionary for matching
words; <mark>let's get to the good bit</mark>.

## Parsing the Game Screen

The <mark>interesting parts of this problem</mark> revolve around interacting
with the game. The game is designed for humans, not computers, so we'll have to
do some [computer vision][computer_vision] work to extract the required
information; [OpenCV][opencv] is ideal for this.

<aside>
We _could_ parse the grid and <mark>optimise our guesses</mark> based upon the
word length, positions where characters overlap, probabilities of each character
appearing in each position and the rarity of the word, but we get points for any
valid words as it is, so we'll ignore this optimisation and call it a feature.
</aside>

The first step of the process is isolating the wheel. Firstly we convert the
image to greyscale (colour information isn't important to us) and then
[threshold][thresholding] it to give us a purely black and white representation.
We also normalise the image to always have a black background with white letters
(sometimes the wheel is white with black letters).

<div class="clear"></div>
![Level 11 - Grayscale]({% link /assets/posts/wordscapes-with-opencv/level_11_black_and_white.png %})

We can now easily mask out the remainder of the image as the wheel is always in
the same position. To achieve this, all we need to do is [bitwise
AND][bitwise_and] a white circle over the letter wheel to leave us with just the
letters.

![Level 11 - Grayscale]({% link /assets/posts/wordscapes-with-opencv/level_11_masked_letters.png %})

Our final computer vision step is to isolate the _individual characters_ and as
we're creating a generic solution that should work on _any_ level with _any_
number of characters, we can't use absolute coordinates to do this, <mark>we
need to do it dynamically</mark>.

The OpenCV `findContours` function provides us with a way to do this.

> Contours can be explained simply as a curve joining all the continuous points
> (along the boundary), having same color or intensity. The contours are a useful
> tool for shape analysis and object detection and recognition. <cite>[OpenCV][contours]</cite>

So, using `findContours` followed by `boundingRect` leaves us with each letter
nicely isolated.

![Level 11 - Letters]({% link /assets/posts/wordscapes-with-opencv/level_11_letters.png %})

### OCR - Optical Character Recognition

> Optical character recognition [...] (OCR) is the electronic or mechanical
> conversion of images of typed, handwritten or printed text into
> machine-encoded text <cite>[Wikipedia][ocr]</cite>

Now we've extracted each character, we just need to identify _which_ characters
they are. We _could_ use machine learning to do this, but <mark>there's a
simpler way</mark> for us to achieve the same result.

If we store a copy of each letter in a library (manually labeling it the first
time we see it) and _simply [XOR][xor]_ it with the letter we're wanting to
identify, <mark>we'll be left with a diff</mark> of the two images. The result
with the least difference is our letter.

Let's run through a quick example. Take the letter "T" (currently unidentified),
and XOR it with with each letter in our library:

![Level 11 - Letters XORed]({% link /assets/posts/wordscapes-with-opencv/level_11_letters_xor.png %})

It's quite clear that when our unidentified letter is XORed with our library's
"T", <mark>comparatively few pixels differ</mark>. Here's that same data
represented as a graph, it's easy to see here that the letter "T" is the closest
match:

<style markdown="0">
#diff-graph {
	display: flex;
	width: 100%;
	height: 200px;

	overflow-x: auto;

	align-items: flex-end;
}

#diff-graph > div {
	box-sizing: content-box;
	width: 4%;
	min-width: 1em;

	margin-right: 5px;
	padding: 3px;

	color: #000;
	background-color: #dcdcdc;
	text-align: center;
}
</style>
<div markdown="0" id="diff-graph">
	<div style="height:  71.1%">A</div>
	<div style="height:  74.2%">B</div>
	<div style="height:  64.3%">C</div>
	<div style="height:  76.1%">D</div>
	<div style="height:  57.7%">E</div>
	<div style="height:  53.0%">F</div>
	<div style="height:  74.4%">G</div>
	<div style="height:  85.3%">H</div>
	<div style="height:  61.5%">I</div>
	<div style="height:  52.2%">J</div>
	<div style="height:  65.6%">K</div>
	<div style="height:  69.3%">L</div>
	<div style="height: 100.0%">M</div>
	<div style="height:  90.7%">N</div>
	<div style="height:  78.7%">O</div>
	<div style="height:  67.7%">P</div>
	<div style="height:  84.4%">Q</div>
	<div style="height:  73.9%">R</div>
	<div style="height:  54.9%">S</div>
	<div style="height:   8.5%">T</div>
	<div style="height:  81.8%">U</div>
	<div style="height:  64.4%">V</div>
	<div style="height:  98.8%">W</div>
	<div style="height:  64.2%">X</div>
	<div style="height:  49.0%">Y</div>
	<div style="height:  66.6%">Z</div>
</div>

## Game Interaction

We've identified our letters and we've searched through a dictionary for valid
words, <mark>all we have to do is swipe them in and we're done</mark>!

Given that we already know the position of the letters on the screen thanks to
the `boundingRect` function, we just need a way to _actually send_ the swipe
commands. Thankfully Google provides us with a tool called [Android Debug
Bridge][adb] (`adb` for short) that allows us to interact with our device from a
connected computer.

Using the `adb shell` command allows us to execute commands on the device, pair
this with the `input` command and we're able to send a single swipe. If we
wanted to bring up our app drawer from the home screen, for example, we could do
something like this: `adb shell input swipe 100 1000 100 100`.

Unfortunately, that's as far as this command can take us. As I mentioned above,
the `input` command only allows us to send a _single_ swipe, rather than the
_multiple continuous_ swipes that are needed to spell out our word.

### The `sendevent` Command

Let's go one level lower, the `sendevent` command. Unfortunately, as far as I've
been able to find, this command isn't very well documented, so we're going to
have to do a bit of work to figure out how to use it. All we get when we run
`sendevent --help` is this: `usage: sendevent DEVICE TYPE CODE VALUE` and the
single descriptive line of text stating `Sends a Linux input event`.

Thankfully `sendevent` is an open source tool, so we can take a look at [the
source code][sendevent]. It appears as though the command is basically just
taking a few parameters, storing them in a struct and writing them to a file.
<mark>Not overly helpful in explaining what's going on</mark>.

There are a few comments and lines of code that, after some more searching, lead
us to the [Linux kernel documentation on event codes][event_codes] and
[documentation on the multi-touch (MT) protocol][mt_protocol].

Using this documentation and cross checking values with the output of the
`getevent` command, we have enough information to emulate a continuous swipe
on the screen. For example, to draw a triangle to the screen, we might do
something like this:

```bash
sendevent /dev/input/event1 3 57 23   # EV_ABS  ABS_MT_TRACKING_ID  CONTACT SLOT
sendevent /dev/input/event1 3 53 360  # EV_ABS  ABS_MT_POSITION_X   X POSITION
sendevent /dev/input/event1 3 54 300  # EV_ABS  ABS_MT_POSITION_Y   Y POSITION
sendevent /dev/input/event1 3 48 10   # EV_ABS  ABS_MT_TOUCH_MAJOR  TOUCH DIAMETER
sendevent /dev/input/event1 3 58 10   # EV_ABS  ABS_MT_PRESSURE     PRESSURE
sendevent /dev/input/event1 1 330 1   # EV_KEY  BTN_TOUCH           KEY DOWN
sendevent /dev/input/event1 0 0 0     # EV_SYN  SYN_REPORT

sendevent /dev/input/event1 3 53 580  # EV_ABS  ABS_MT_POSITION_X   X POSITION
sendevent /dev/input/event1 3 54 70   # EV_ABS  ABS_MT_POSITION_Y   Y POSITION
sendevent /dev/input/event1 0 0 0     # EV_SYN  SYN_REPORT

sendevent /dev/input/event1 3 53 140  # EV_ABS  ABS_MT_POSITION_X   X POSITION
sendevent /dev/input/event1 3 54 700  # EV_ABS  ABS_MT_POSITION_Y   Y POSITION
sendevent /dev/input/event1 0 0 0     # EV_SYN  SYN_REPORT

sendevent /dev/input/event1 3 53 360  # EV_ABS  ABS_MT_POSITION_X   X POSITION
sendevent /dev/input/event1 3 54 300  # EV_ABS  ABS_MT_POSITION_Y   Y POSITION
sendevent /dev/input/event1 0 0 0     # EV_SYN  SYN_REPORT

sendevent /dev/input/event1 0 0 0     # EV_SYN  SYN_REPORT
sendevent /dev/input/event1 1 330 0   # EV_KEY  BTN_TOUCH           KEY UP
```

### Playing the Game

Now that we can interact with the device in the correct manner, everything falls
into place; we can finally, automatically, play a level:

<video controls loop width="232" height="416">
	<source src="{% link /assets/posts/wordscapes-with-opencv/level_11_slow.mp4 %}">
</video>

<mark>So we've achieved our goal</mark> of automatically completing a level of
Wordscapes!

### Speeding things up

Yeah, I was a bit disappointed too, <mark>I wanted to see some blazingly fast
level completions</mark>, but it seems that launching `sendevent` for each and
every fraction of a packet isn't _particularly_ fast (who'd have thought).
Fortunately, we know _exactly_ what `sendevent` is doing thanks to our earlier
research. We can just replicate what we found in the [source code][sendevent]
and execute it as fast as we like in our own codebase, without having to launch
a separate process each time.

Replicating `sendevent` boils down to creating this struct and writing it to
`/dev/input/event1`:

```c
struct input_event {
	struct timeval time;
	__u16 type;
	__u16 code;
	__s32 value;
};
```

A quick and easy job with the following Python: `struct.pack('<QQHHi', 0, 0,
event_type, code, value)`. Once we've translated our calls from `sendevent` to
this `pack` call and written directly the device file, we're done! This is
what we end up with:

<video controls loop width="232" height="416">
	<source src="{% link /assets/posts/wordscapes-with-opencv/level_11_fast.mp4 %}">
</video>

That's a <mark>speed up of 687%</mark> (from 24.4 seconds to 3.1). In fact
<mark>we <i>can</i> go faster</mark>, it's now the _device/game_ that struggles
to keep up with processing the input.

I'll leave you with one more level, further into the game, for your enjoyment:

<video controls loop width="232" height="416">
	<source src="{% link /assets/posts/wordscapes-with-opencv/level_448_fast.mp4 %}">
</video>


[wordscapes]: https://play.google.com/store/apps/details?id=com.peoplefun.wordcross
[computer_vision]: https://en.wikipedia.org/wiki/Computer_vision
[opencv]: https://opencv.org
[thresholding]: https://en.wikipedia.org/wiki/Thresholding_(image_processing)
[bitwise_and]: https://en.wikipedia.org/wiki/Bitwise_operation#AND
[xor]: https://en.wikipedia.org/wiki/Exclusive_or
[contours]: https://docs.opencv.org/3.4/d4/d73/tutorial_py_contours_begin.html
[ocr]: https://en.wikipedia.org/wiki/Optical_character_recognition
[adb]: https://developer.android.com/studio/command-line/adb
[sendevent]: https://android.googlesource.com/platform/system/core/+/android-4.2.1_r1/toolbox/sendevent.c
[event_codes]: https://www.kernel.org/doc/html/latest/input/event-codes.html
[mt_protocol]: https://www.kernel.org/doc/html/latest/input/multi-touch-protocol.html
[event_codes_source]: https://github.com/torvalds/linux/blob/master/include/uapi/linux/input-event-codes.h
