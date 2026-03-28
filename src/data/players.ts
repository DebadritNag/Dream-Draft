export interface Player {
  id: string;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  rating: number;
  club: string;
  image?: string;
}

export const players: Player[] = [
  { id: "p1",  name: "Erling Haaland",         position: "FWD", rating: 91, club: "Man City" },
  { id: "p2",  name: "Kylian Mbappé",           position: "FWD", rating: 91, club: "Real Madrid" },
  { id: "p3",  name: "Vinícius Jr.",            position: "FWD", rating: 90, club: "Real Madrid" },
  { id: "p4",  name: "Rodri",                   position: "MID", rating: 91, club: "Man City" },
  { id: "p5",  name: "Jude Bellingham",         position: "MID", rating: 89, club: "Real Madrid" },
  { id: "p6",  name: "Kevin De Bruyne",         position: "MID", rating: 90, club: "Man City" },
  { id: "p7",  name: "Virgil van Dijk",         position: "DEF", rating: 89, club: "Liverpool" },
  { id: "p8",  name: "Rúben Dias",              position: "DEF", rating: 88, club: "Man City" },
  { id: "p9",  name: "Thibaut Courtois",        position: "GK",  rating: 90, club: "Real Madrid" },
  { id: "p10", name: "Alisson Becker",          position: "GK",  rating: 89, club: "Liverpool" },
  { id: "p11", name: "Mohamed Salah",           position: "FWD", rating: 89, club: "Liverpool" },
  { id: "p12", name: "Bukayo Saka",             position: "FWD", rating: 88, club: "Arsenal" },
  { id: "p13", name: "Martin Ødegaard",         position: "MID", rating: 88, club: "Arsenal" },
  { id: "p14", name: "William Saliba",          position: "DEF", rating: 87, club: "Arsenal" },
  { id: "p15", name: "Trent Alexander-Arnold",  position: "DEF", rating: 87, club: "Liverpool" },
  { id: "p16", name: "Phil Foden",              position: "MID", rating: 88, club: "Man City" },
  { id: "p17", name: "Bruno Fernandes",         position: "MID", rating: 87, club: "Man United" },
  { id: "p18", name: "Marc-André ter Stegen",   position: "GK",  rating: 88, club: "Barcelona" },
  { id: "p19", name: "Lamine Yamal",            position: "FWD", rating: 86, club: "Barcelona" },
  { id: "p20", name: "Florian Wirtz",           position: "MID", rating: 87, club: "Leverkusen" },
];
