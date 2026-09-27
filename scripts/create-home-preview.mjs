import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const asset=(name,type="image/png")=>`data:${type};base64,${fs.readFileSync(path.join(root,"public/assets",name)).toString("base64")}`;
const css=fs.readFileSync(path.join(root,"app/globals.css"),"utf8");
const leaf=asset("leaf-mark-transparent.png");
const room=asset("home-room-no-story.png");
const portrait=asset("jasseela-home.jpg","image/jpeg");
const branch=asset("leaf-branch-transparent.png");
const story=asset("story-script-repaired.png");
const footer=asset("footer-script.png");
const icon=(body)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8">${body}</svg>`;
const icons=[
  icon('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>'),
  icon('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 18 2 18 2c1 5-1 9-5 11"/><path d="M2 21c0-3 1.85-5.36 5.08-6.94C9.38 12.93 12 13 13 13"/>'),
  icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'),
  icon('<path d="M7 20h10M10 20c5.5-2.5 8-6 8-11-5 0-8.5 2.5-10 7M14 4c-4.5.5-8 3-8 8 0 2.5 1.5 4 4 4"/>')
];
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jess Counselling – Home Page Preview</title><style>${css}</style></head><body><main class="page page-home"><div class="paper"><header class="site-header"><a class="brand" href="#"><img src="${leaf}" alt=""><span><strong>Jess Counselling</strong><em>Online Counselling Services</em><i>Malayalam / English</i></span></a><nav><a class="active" href="#">Home</a><a href="#">About</a><a href="#">Services</a><a href="#">Contact</a></nav><a class="button header-button" href="#">Book a Free Consultation</a></header><section class="home-hero"><div class="home-copy"><p class="eyebrow">A SAFE SPACE TO TALK</p><h1>You’re Not<br>Alone</h1><p>Life doesn’t always go according to plan. Whether you’re feeling overwhelmed, facing relationship challenges, struggling with parenting, or simply need someone to talk to — Jess Counselling offers a compassionate and confidential space to help you heal, grow and move forward.</p><a class="button hero-button" href="#">Book a Free Consultation →</a></div><div class="home-scene"><img src="${room}" alt="A peaceful counselling room"><a href="#" class="meet-card"><img src="${portrait}" alt="Jasseela, Chief Counsellor"><span><strong>Meet Jasseela</strong><small>The Chief Counsellor →</small></span><img class="meet-leaves" src="${branch}" alt=""></a><img class="story-script" src="${story}" alt="Your Story Matters"></div></section><section class="home-values">${["Compassionate Support","Confidential and Safe","Personalised Approach","A Brighter Tomorrow"].map((title,index)=>`<div>${icons[index]}<span>${title}</span></div>`).join("")}</section><blockquote>“A safe place to talk. A supportive space to grow.”</blockquote><footer class="site-footer"><a class="footer-brand" href="#"><img src="${leaf}" alt=""><span><strong>Jess Counselling</strong><em>Online Counselling Services</em><i>Malayalam / English</i></span></a><div class="footer-item"><span>Jess Counselling LLP<br>11/380, Pookkarathottam, Olavakkode<br>Palakkad, Kerala, India – 678002</span></div><a class="footer-item" href="mailto:hello@jesscounselling.online"><span>hello@jesscounselling.online</span></a><img class="footer-script" src="${footer}" alt="Compassion Creates Change"><small class="footer-copy">© 2026 Jess Counselling LLP. All rights reserved.</small></footer></div></main></body></html>`;
const output="/workspace/scratch/fba373fbf77c/Home_Page_Preview.html";
fs.writeFileSync(output,html);
console.log(output);
