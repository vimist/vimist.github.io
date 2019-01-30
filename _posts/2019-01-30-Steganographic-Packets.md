---
tags: Python Steganography Networking
comments: true
---

I had an idea a while ago about a method of sending data across a network link
<mark>without sending a single byte of data in the packets themselves</mark>.

Here's one of the packets:

```
00000000: cc 33 bb c5 11 6e 70 85 c2 3a c4 25 08 00 45 00  .3...np..:.%..E.
00000010: 00 1c 00 01 00 00 40 01 f6 0c c0 a8 01 85 c0 a8  ......@.........
00000020: 01 fe 08 00 f7 ff 00 00 00 00                    ..........
```

Not a single byte of payload data in there! We could break out every single bit
(pun intended) to prove it, but by the end of this post, hopefully, I won't need
to!

So how is it possible to send data between two hosts without actually sending a
single byte of it in the packets themselves?

<!-- more -->

<aside>
[Differential coding][differential_coding] is similar to this (in terms of
encoding the data between two states), although far more practical and with
legitimate uses.
</aside>

Here's the secret... we encode our data in the **time between** packets!

The Encoding Scheme
-------------------

Let's say we wanted to send the data "Hello World!", firstly we'd need to get
their numeric values so we can really see what we're dealing with:

```
H   e   l   l   o       W   o   r   l   d   !
72  101 108 108 111 32  87  111 114 108 100 33
```

Then we need to decide how we're going to represent this as time. Maybe we could
wait 72 milliseconds to send a letter "H", 101 milliseconds to send an "e" and
so on.  Theoretically, that would work, but **[network jitter][jitter] is going
to kill us** if we only leave 1 millisecond between different values. Perhaps we
could give ourselves more time; 720 milliseconds for an "H", 1010 milliseconds
for an "e", etc. That sounds like reasonable times for a LAN, we should be able
to recover our data even with a bit of jitter, it would be pretty slow though.
Say we wanted to send a "ÿ" (from the [Latin 1][latin1] character encoding),
we'd have to wait 2.55 seconds...  **ouch**!

Obviously we're not going for throughput here, **but we can definitely do
better** than a maximum time of 2.55 seconds for a single byte of data!

<aside>
1 byte (8 bits) can represent 256 different values:
11111111<sub>2</sub> = 255<sub>10</sub> (+1 for 0)

Removing half of those bits (leaving us with 4 bits) represents only 16
different values: 1111<sub>2</sub> = 15<sub>10</sub> (+1 for 0)

That's much better!
</aside>

Instead of sending full bytes with 256 different value to encode, maybe we could
send half bytes (4 bits, [nibbles][nibble]) instead. This would reduce the
number of combinations we need to represent by a factor of 16!

<div class="clear"></div>

Here's our data broken down into nibbles:

```
H         e         l         l         o                   W         o         r         l         d         !
0100 1000 0110 0101 0110 1100 0110 1100 0110 1111 0010 0000 0101 0111 0110 1111 0111 0010 0110 1100 0110 0100 0010 0001
```

Encoding our data this way does mean sending 2 packets per byte of data though,
so we'd end up having to send `N * 2 + 1` packets (where `N` is the number of
bytes we want to send), but I think that's a reasonable compromise for my use
case. Depending on the specific application, you might want to alter this.

So here it is, this is our encoding scheme, the nibble we want to send on the
left and the interval we should use to represent that data on the right:

|Data|Interval|
|----|-------:|
|0000|      10|
|0001|      20|
|0010|      30|
|0011|      40|
|0100|      50|
|0101|      60|
|0110|      70|
|0111|      80|
|1000|      90|
|1001|     100|
|1010|     110|
|1011|     120|
|1100|     130|
|1101|     140|
|1110|     150|
|1111|     160|

<mark>Simple enough</mark>. To send a "ÿ" using this encoding scheme would only
take us 320 milliseconds (160 x 2); a bit better than 2.55 seconds.

Sending the Packets
-------------------

<aside>
The `send` method Scapy provides to send packets is _just_ a bit too slow for a 10
millisecond interval, as it [creates and closes the socket for each
packet][slow_scapy_send]!

If you're interested in implementing this in Python for yourself, you can get
around this problem by manually creating a `L3socket` and closing it when you're
done.
</aside>

Using the Python library [Scapy][scapy], we can write a quick script to encode
data using the above scheme; we'll use [ICMP][icmp] packets, but it would work
with anything. You can find [my quick effort on GitHub][source_code].

So, after a bit of tinkering in Python and monitoring our network card for ICMP
packets (`tcpdump 'icmp[icmptype] = 8'`) we get something looking like this on
the wire:

<div class="clear"></div>

```
10:58:36.936514 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:36.988860 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.081287 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.153525 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.215639 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.288139 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.421033 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.493561 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.625966 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.698109 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.860629 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.892763 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.904821 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:37.967002 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.049609 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.122016 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.284947 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.368031 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.400642 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.473075 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.605526 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.678002 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.730348 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.763012 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
10:58:38.785684 IP dans-pc.home > BThomehub.home: ICMP echo request, id 0, seq 0, length 8
```

Now we need to use this information (specifically the times the packets arrived)
to recover our encoded data. In the table below we go through this process
manually, but we can also write [a program to do this for us][source_code].

To recover our data, we do the following:

1. Calculate the interval between packets.
2. Find the closest value in our encoding scheme.
3. Store the looked up value until we have a full 8 bits (a byte, two nibbles).
4. Convert our 8 bits to decimal (implicit when programmed).
5. Look up the value to recover the original byte value.

|Interval|Closest Encoding|Looked Up Value|Full Byte|Decimal Value|ASCII|
|-------:|---------------:|--------------:|--------:|------------:|-----|
|    52.3|              50|           0100|         |             |     |
|    92.4|              90|           1000| 01001000|           72|H    |
|    72.2|              70|           0110|         |             |     |
|    62.1|              60|           0101| 01100101|          101|e    |
|    72.5|              70|           0110|         |             |     |
|   132.9|             130|           1100| 01101100|          108|l    |
|    72.5|              70|           0110|         |             |     |
|   132.4|             130|           1100| 01101100|          108|l    |
|    72.1|              70|           0110|         |             |     |
|   162.5|             160|           1111| 01101111|          111|o    |
|    32.1|              30|           0010|         |             |     |
|    12.1|              10|           0000| 00100000|           32|     |
|    62.2|              60|           0101|         |             |     |
|    82.6|              80|           0111| 01010111|           87|W    |
|    72.4|              70|           0110|         |             |     |
|   162.9|             160|           1111| 01101111|          111|o    |
|    83.1|              80|           0111|         |             |     |
|    32.6|              30|           0010| 01110010|          114|r    |
|    72.4|              70|           0110|         |             |     |
|   132.5|             130|           1100| 01101100|          108|l    |
|    72.5|              70|           0110|         |             |     |
|    52.3|              50|           0100| 01100100|          100|d    |
|    32.7|              30|           0010|         |             |     |
|    22.7|              20|           0001| 00100001|           33|!    |

There's our recovered message, `Hello World!`!

Mathematically, with this encoding scheme, if we were sending every byte once
(0 - 255) it would take 43520 milliseconds (43.52 seconds) to send.  A
staggering 0.005744 KBps or 5.882 Bps (assuming a perfect distribution)!

We can do Better!
-----------------

Now, if I _really_ wanted to use this to exfiltrate data from a machine,
<mark>I'd change a few things</mark> ;)

Firstly, I'd try to understand the data that I'm wanting to exfiltrate, so that
I could <mark>re-order the encoding scheme</mark> to have the most common bytes
with the lowest interval to increase transmission speed.

Secondly, I'd <mark>put some payload data in my packets</mark>, probably just
random data (or maybe decoy data), this would make it look like the payload was
in the packet to throw off anyone looking.

Thirdly, I'd change our encoding scheme to <mark>use prime numbers as the
intervals</mark> and multiply them by a random number for each packet we send.
On the receiving side, we would iterate through our encoding scheme taking the
modulus of the calculated interval and determine which interval in our encoding
scheme is closest in order to recover the transmitted value. This would let us
disguise even the intervals of the packets, as they would be different each
time.

Lastly, and you'd have to be really serious to go this far, but lastly, <mark>I
wouldn't send any packets at all</mark>... I would hook in to the network stack
of the machine and just fractionally delay existing outbound packets to
correspond to our encoding scheme. This would require you to have visibility of
all outbound traffic though, so may not be as easy to recover the data, but if
you did...!

[steganography]: https://en.wikipedia.org/wiki/Steganography
[ethernet]: https://en.wikipedia.org/wiki/Ethernet_frame#Frame_%E2%80%93_data_link_layer
[ethertype]: https://en.wikipedia.org/wiki/EtherType#Examples
[ipv4]: https://en.wikipedia.org/wiki/IPv4#Packet_structure
[icmp]: https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol#Datagram_structure
[jitter]: https://en.wikipedia.org/wiki/Jitter
[latin1]: https://en.wikipedia.org/wiki/ISO/IEC_8859-1
[nibble]: https://en.wikipedia.org/wiki/Nibble
[scapy]: https://scapy.net/
[slow_scapy_send]: https://byt3bl33d3r.github.io/mad-max-scapy-improving-scapys-packet-sending-performance.html
[source_code]: https://github.com/vimist/packet_differential_encoding
[differential_coding]: https://en.wikipedia.org/wiki/Differential_coding
