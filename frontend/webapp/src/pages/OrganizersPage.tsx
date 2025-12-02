import { Organizer } from "@/pages/Index";
import OrganizerBlock from "@/components/OrganizerBlock";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

export default function OrganizersPage() {
  const { t } = useTranslation();
  const testOrganizer: Organizer = {
    id: "org-1",
    name: "Cairo Beats",
    logoUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAB9VBMVEUQAy8QAy4FsXn////4RhbRWvL6zx4Cp/8QAzEAACgBhWAAACMAACYAAB8AAAAPBC4AAC4AABwAACsAACQAABgAq/8AABQJACyLQdQAAC0Cff8AADEAABMAAA/IMxUAABr7gR739vgOACUAAAsiHyykoq4VR0h7e4ASZZwMACQAgP8NACn+RxQPOkDCwsO5ur8YEyxqaG0TXo0SABsQOVwiACD3TCG0XNK4LhOoKBMAiV//2DEDdVgFsHv8zh8fGjCZmJzS0tTKrDZST1vh4OFQXGqHlKZfaXqVq7w0NUqqw9VMUWoMEDsNLFYdktsbpfITPmwWS3gXg8UTGDoac68OJlONNzEXVYbPSS+lOyvARS5iJSdPIi4TRZISV7APJlsSKUdDGCgtFkV+QJZ1PZATVasVdugJYcsvDyQhDCvbSylDIVvNYusIjO4OK2COLieUTq2lMyhjMXl1Kyg4GEpaHSUKiewxHEHUafUWTZASO3mKQrt6MbajUr5yMK2NQNluO6moS9RXMYUdAjZkOJg9ImZrQTKgWSu3ZixUMy3qgzGrYzE+JCgQLzoca1zXejkAaUyCTTDZbBStiDnvtSLlmyHWfBhpWzDsyTspHybBp0APVU6OejdTSDBcTC4AIjgbo3yfiko4LSV8ajYgdmfavVJxe45tYoydAAAT/UlEQVR4nO1ci0PU1prPYRBPSDKZJDMT6TBaMq0YAzKKjlagAwLzCBWqtJaHtxXtVSruRaXu9qF92N721lbaXnsXBB9U3fk79/tOMi/Q7naLMtM9v9JxJjlJzu983/ke5xFB4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4PgTQ3UEgcB/+PenBLXffMOm9E/LTyXW8cjYHtuiW12T5wZqj0a2R0aP2/h9qyvzPEC7DwDB7ZGxNxWvM9Y/CAhKpcysoMioNbYdEYm82U3VYgFS19JEhvhBBdtSBetEZLuHseMW2hv4UylRt7qWfwSKImo2AZZvjJ7oFrpPRnyKkVEVlZRQCrKkdSzE8ZOjoycPOJZqvROJnLDssaIMt0fe6mbqawm0rn2jA5QikdG3nVaQ3qh2sEQQjp4BXvbxAzapZxH6ahkZG4+fBE7HT1QyPNlNreNjkYMOU1fBjJn1yNQZZ3oZeSv4Dgjz4IGykoKxcdTwaCSypxuESISYdWqWqnWortbBsQhCBVc/5uwpyxBIvtN9PIL9EY0ptSc6JvU67JCEWnTP6NjY6NugkG+1VjM8GQStjbxjge8n4lRHY8quRzVVBdK9y3KijuBQ1T5QxXA0fDASGXsDi8WmGwGnW7a6ur8XFCMzFT+7PZyoZLh9+3h4LPImCo60gAiBYayutNSUFAlyQaDZbb/9l3ffvfDuX957u4ph5Ix98DjaGSq0TADD1EysntTUPHvu8vtnJajy2389vxfw0t6XLlzYXs3QcRwam/1AEEITjY0dF0W1nhg6cx9t23bpqiJYH+99yceFC/9W1RHPgHcQp6euyFSfBBkuxOrLlmqHtwHmROdvRYZ7z184X6WmENXI8zt37pzXY6dTjZN6KFZPakrMs5eA4eEoUc6/VBbi9iJFzBJFalwBgjuPzMT0+VOyeHphYbZOEmMITqggn7186dJhQe3+KxMifOy9UCnEyEmNSRBwRVT10KGpVGPjfEytdY4syCTUkWVRam21FUelb5SEuLeyJ0b27Jre6WMmRC0wpx1oTkntd0ZV1LSv5q6+f/XqnBCVHGp/XNETL5S19PihI0WG8yF9Hgg2nqqLwM3Q5kA9tzFcOnzubNTpvlBpbEohTWK+SHDnlK1PplIXF8RYrJatDbY+VaNzh7dV4caH0dD5KopMUSMnuqdKDI8cotbsrGTMnr52euYDORSrTVXFSkn0xrb1+OhcVC9T3OspauRk+FqZ4GszMXH21ETKw8XJ6VrNFWl47tIGgugzPjDe3Vty/Ocv/DuI8bg8Xyb42szMVKoDY1OGjlRtBuGESFc/ehpB6I9n45+cL3Hc+9L57e9061fKBF87kirRQ6QO1aYMzf94BkGkqNifXGABKuD8u+8pVDxSIngk1ViFjovyVnN5BsIbO2FJUSXHiZp/++Tjjz/+5D2pGzIq50iR4M7GdeiYrEklFXDq7PAzKZ6TKCWQTFjwv4Bu3WcIBFPrGaauxbaaylNBVKqffSbFT8OYD0O4488dUuOIJ8L1KsqUtCadBebzRKJPp3jp+qdxVogydjiBKE55Iqy2MQwLoa1l8mxQQk3t8lMIfnl9x/V40TwSwmYq9Hkmwg2dsLFjQq5NS+pBVbX1QQ0Q/GzHjk9bq6pNhNA0Y7hRR1OnQ2otj4NTOZyYu1HhNi59+RkQ/PwLpbIUTrcdmgAl3ShC0NGanuYXnauXz80FlblzN74Ecl8Cvc+u7/h8x+c35fXzhC2gphtE2NE4r29Nzf+XEL2w7QY1tNAXnzFc38Ew51QVBLNKZyd2Htmgoj7BmpWhOOfp52XJuHkd6fn8dnwqV09ro5qGFnauU9KOi9MiVWszsShCQjtz6fJX8tyOSoCSbiiqUnk+VS3AyQ9CbPa7hudoCBHDZz8kmil9/XklwU9Nh9L1s9lUsKdSjZjbdwBSqckZXXcsIwY+s3ZtKSH6rmjSoo5RJcIdfxc3lsV5fHFmYXLiImBqcsHSW65NwbdpXaC0ZmUoKB/euHTpsEHPVhH8WmEzGOsLUzMUi4mGKIqyGIsJoQXMETtS06FaNTQQmGpXmQuMyzcrlPTzLwxVYOajOFRI2PKMkDj7zbf/AHz7na3HiBCbR3VtnLJqV4SQAnuWVJO+ZtR8CYqEmEwpBY8ohndCzPjmx1sv+7j1/Q8idfTpKxNTCzUcsxEqsYDtow91rcLQ3JSU24urnTKuSizZSCp+9+PLlbj1vR2iqLI1PNZGVXHOSwU16ptS+Pj6q/Dutb6Gtebe1YcOLS6AUo1vX16PW9/ptaqcPqggvY+d8P0oEaSbzM1/cZPGbzf3NTQ09PU2H21eLVpUKn2/gSBQ/AFNTO06CtS8qzduvH9WATmp5OyHf39DVUR7FfkBjvY2Nzf3PiRsYlh+GsGXf7QJrpBSa3cVGGS1rVHJRIcNPxwwKrT7iU+woe+nZqR4G8/pPz+N4MvfxQilJi4Eo7U5V+pZSfAIzGCy9Vz2E6DmM+xFIR5tfijQ2A+3/llGieDPIRoS7aQUMmt2+okicJxCpdbu3uZOwVlsKKOZCfHoE4fKd355HfHLv/6zguPPMpWXji0vL9+5W7senw01IVMLZNewqt7u28Cw+eiqKq80FfHLv3yKt74RqbTS09T0elPT8lJLrQqxCAcJriWt5gqCDUd/6mUUm5NimSEwQo63/nFXF0qHe36t2ZEoHzSJslu0VvueynDVqGQIcvznt98ZsVhMv9fjEbxj1LTLAJBOMCyLlr3W8FSGvca9KoZNy/FY7P69JVu/vwLdcOWBXPvLhpOru5OEVvVC7Ic+w+aHD3oq1RQodsfu9PQsL+mQZOhyDFxizYbeRRBw+lWGtIrhbnu5SoavNx2TlnqaXu95EKLesmihdnP8CthVdgY8fpHh0VW5uiMCVrRj8HnMqO3uVw3qrDVUqunaTz/5Imxe1Jd6PPUsoefB3eWepp675lZX+/fgYV9DtTssM3SUY5X0gOvry4bxeGXllXqSoXC7iuHaw8XeEkMhBLamimNTz5IeEsV66H1lVJvSRet2kSFENVSs7onAdkUWNgzG1TZohQwhAXao2Vmk2Imzh9XmFDxGWqh5F1ENWu6H8KXTHnfIwyeQWwDGBaq3PFqusjWvNy2F6qoT4ka8oi3t62tY1J6sdVIBM47mo4sOlX59pK+j2HSv1scwNgDj7j5PhE92QSi+iEmj07na26nGHvT0LIXuHqsMbZpWaj3c3gBSjGn6Fu1OoPrEeZh0IIe3BKJDYNrzKGTcWy4ZGnD3oTrrhwJNe0q6tmoJLF20m9cWvT3ALY+B0Z0Wqt+9s1xyG8dqNu99JljY1tebJtTpBaI25lTNuD+WxO72YIgG8aecfLyy3MOwopM6cxeC0Nm39uQ27qeAIHyt0wsBFnGilGAqeEyGAJvSkC7Lj+7fvyuzn1td5d8DXDlz23bYthL68MlDgmFcAzpGPCvf67mnAz+i4n4LM9RiIr96E6HgLZxhe4BRctYaUuwU2GCjfjdd3EFbypTqS4QbQTBh7GtY9eewa3yc4v8ASrwYYPdWV+S5AUVmNff1pbe6Is8LhM0fWrsX7a2uyXMFmFfnfy7FwcHx/xy0+JYSD6T8pfTaIELKBUhx7UU1vN1fqrDubMUP7yl+RFS8hPpvfCFsepKtpiab97Yi4t2WlImVniUI696mQ4hQQb64gsY/UqZBK26lEi839AJTNujtTbUKxbVixDtGvfk7tvzIu5Zu0ttf8AG6KJreUnRq6n6D+mtBqVjkRL15Uuo/mJrFxQmlkULKinivdCF+YVyp57/MRfXYUnhQSA+FQmaxhVpisZYQi9vxTg5AdVRVIJuyYRGbTQnnBwfTCQfJOum8yBjKg2lWcWMw7Y9WUykRT8QBiTgO0UNJb1GiX5KoUTydiJqemMw4KxumrA2t252IJLtCv/sAcd9rxJh8en5yftpm2xTU8YM+xm2qbsbKBiKY8f62AGAgb0JFw11tGusJWqALFzeb6cCr/iJncX+gzccgcAvvawuz4+FA1y5s/HgXO9eVNlBSZnqI/RyyMbNwIKhDrGFOGVryEuOex7hLPzY7kcIVYRdPh6A6Z7xXUSDOOJsTwdPEUGDf/sH9/W37Ueug3hre2OwOdGn47yslhma+v79/KDAAn2mT0uiAx5BAySjuDk4G2uDUvkDbKyh0qT0w1AXoN1AldhfHx1GI4jFveAMZgrJcxOWZjR0dEzIyjLA3+SDDg9ZmJClESOwLtAclUVaCuMP+txgKpqIl2gP745qCPaiSYavHsD+oKIlBjzAwHGzVFEViHRcYri0CbmMHAIZNdx4/fryETRq61tg4dUg5PektkrZOHDgwGomMHjhwwqabMpAsDwZeTUBCXmyu32CI1g/qvV/2TP1TZNiPdIJDQ3HqMRSRHXMswLAX7IfJfgHDnkd6SwvbARVbaOxYwJWaOhJUiWNFD0QiexKWs0nuQusKgCUhpdb6LRkKTPf2G97emKcxVIBRsG2g1ZehZhiGzkwkMuyWbJt5CGT4+NGjRwqeCp1ONaYmrx0yYoLvGy1kyF4YRjfBW9DWgbag981rsd+SIfEY+su6n8YwGE0E+wPtksdwX6FQaM+bPsO+NUBnUUubwNCwWVMiTkEfbExNLLD7wjM8hmq5Tn+MYXCoLVjZUMCwm21h6vZtKTIsP6fMEGUYZRoIVjdKGcPAwMBAW2BfHNofGTK8ipIqWZonWHHRn2Jc9uaFxYWLaGgar8hex/MY/mFqRcQHkCHxwzBCPRlSalYyLBevZhjGypta2Zbu2wcEg6j1yLBdeyWdVlgIhzJkKxmY1ECGK3fu/HqfDfarNCTOTE+Crl4LsabcZIZKfyAvetrAOsGufQEF4yfwg2UtLQu5giG2BW6GAmZd4aKWtoKS9oepb2kM0/TiFq8f4vZE9P7M0oRioRiLnUK2HKMtYHDYWxc2n6GZx0ZHmycynWGMBWZj+yXhN2QoaKxtCDW8kr6lEYIDYLqIb0uLlzGGSI6Fe8jwgSQpEsiMhqZTEzMtMR1M6ilvDfEmM6TRfnAXYUkJDrajrHRkLIlKdCCQND2GXcF4PLprA0N9EEvKUnwooLGSyBCaZhidBis5CBfGW1nM5zFkD1SZpVlGPAYHoU+Cw5+4MpXqSM2YTI/szWUItqYLYpH2/oFAm+IzHmrPQuzSjkqKdgTtxwBTWd9b+Be2Ysn9UHI/Wl/K/CHer20I+id6zja8cF8a0wXmD4k/Lqzf8Wfd/gv8pzB7ETedNHakTnlhatFbbNqgKyWJ/UNg89q6MJAGj+D9HBj0gk5Bax9C7PN+yvuLugeKHS2WZJWhtqfXUn8ASRG7i104hIE7Ta6t7fZ3mULUa68cY1jS8XVu9jy+j2BiWmS3UQk5Pjb2prOp0wBiQnklHQwz3wwJjhFM5pWE6LchVYKAhM9XUNKS/w1qK0NJLeEZKkLFNOuwVEtjdkLN1iC70vRe/mk45VyT6opkQD9klgVSKfnQ7CHZX8gPn5aqOpu7tgF3YgtefOXZAtOs8LSE5Xyl6lW89AGci+kUM1t2yjtn+muK/XSReHM0ZYI4ocOyTb+hsKxJK1JuIpDNyAzLNSs+tuKuG795awrxUy1d4V3iOVPq5+jsTNULk0lxn4xavB3yI/5lrFVxPV+Zf+U/m47KARVSHqAoHfICWFIc0lHL1aZsxAJLeLSL007FhiGkNFDij4UQbzDj+RLaCBx38MaGmCSEUucQBF+FyyBFbqUTvl4K6+afitSoJyladVdvZOqFMaRmFBcwSfGoSOXW1lbN16+oAUch15Mhe1BawzKOvIBQNImKu+AicCVhhxINDZKjgWiUeKvvNsPRqCoYra1goJRE1KFSHL87YYHAFSJc6EQxHtXEFyRGJ+0OylQp5HLD4Wwul8sw82im3RGHhjPZaLag4MlsmKU2cEQZzklOPiMrmbyYzLi5JPyQ4Aaum0WK1Iab5BW4VUGWCm4ur+FdC1o+pxm5vDGSUUjaHbaplBl5MdMeWLVclCpuIesm81m3MMKcH9YtKiRcN92eC8fdTNbNos+gcdcN5ty0NOjamjscLuTyhbw44mpaxh3JsiqbeTebHY9Cg+WlYTdfGJHZXZWsm9ByhWAmo3j31rwGee4gNOpCPRzFzRRcS9/lDkqsE8XxKEm4mVw2F251h4OFHAbdINrcIPwhQ8UdVkbcXFZDhgn4IbO3szt5N5ORd2VyGeDm5gqgmJablo1hN2Fk3SA8K8yeqOWyL2bnnjPium5B0dycm4nSpDtooue12FGo9wiobTjKGGIE4Ay6WWStDLpRICVGtWE3qzCG2bCk+QwLBTkMep0nUnQQLheS7hkqgQxRU3JR9sSMpkGveCFqqmQyoEWocnloWGCIDp36R4NuFsQAWprLQNfBLCjram4+V1DSICg3rwBZxlCRQROZmFFL0xLVoGWgxwKjjALtdoZAgSDdlQFllzI5uHcS2iCTfxGriKVCXrIy40oBqps3jQwb6qVw1NAySa2QD2ezhpHNFEbYmKozWNAMJTssSvlMZkQSkgWQp4mWRhvOeKaDpDM2JeJIIZOVnWyuYAnUyYyrUEgD+WbGCT5RziQNuOCFMBQkyFHBfEom/gmaN6xO8G2lcNRwqCELxPDeXgrHHQlfMSiih9BwaEwKQ96kQkkiK5oXoOPdqOAoEjghQ8PxEIofJmYVjgIOB25K4F9RkupiIfifbpkJBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHB8cLxn8D/2G3Ddo8W3MAAAAASUVORK5CYII=",
    bio: "A collective bringing electrifying music experiences to life.",
    events: [
      {
        id: "evt-101",
        title: "Desert Bass Festival",
        date: "2025-09-12",
        venue: "Giza Sound Arena",
        location: "Giza Plateau",
        imageUrl: "https://media.timeout.com/images/106204051/image.jpg",
        ticketsSold: 470,
        ticketsLeft: 30,
        freeTickets: 5,
        giftTicketIds: ["gift-1", "gift-2", "gift-3", "gift-4", "gift-5"],

        completionRate: 94, // e.g., (470 / (470 + 30)) * 100
        netEarnings: 470 * 250, // example ticket price EGP 250
        receivedPayouts: 100000,
        pendingPayouts: 17750,
      },
      {
        id: "evt-102",
        title: "Sunset House Party",
        date: "2025-09-28",
        venue: "Nile Rooftop Lounge",
        location: "Downtown Cairo",
        imageUrl: "https://media.timeout.com/images/106204051/image.jpg",
        ticketsSold: 150,
        ticketsLeft: 50,
        freeTickets: 10,
        giftTicketIds: ["gift-1", "gift-2", "gift-3", "gift-4", "gift-5"],

        completionRate: 75, // (150 / (150 + 50)) * 100
        netEarnings: 150 * 200, // example ticket price EGP 200
        receivedPayouts: 25000,
        pendingPayouts: 5000,
      },
      {
        id: "evt-103",
        title: "Electronic Nights Vol. 5",
        date: "2025-10-15",
        venue: "Cairo Expo City",
        location: "New Cairo",
        imageUrl: "https://media.timeout.com/images/106204051/image.jpg",
        ticketsSold: 800,
        ticketsLeft: 200,
        freeTickets: 20,
        giftTicketIds: ["gift-1", "gift-2", "gift-3", "gift-4", "gift-5"],

        completionRate: 80, // (800 / (800 + 200)) * 100
        netEarnings: 800 * 300, // example ticket price EGP 300
        receivedPayouts: 200000,
        pendingPayouts: 40000,
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-dark">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {t("organizer.overviewTitle")}
          </h1>
          <p className="text-muted-foreground text-base">
            {t("organizer.overviewDescription")}
          </p>
        </div>

        <Separator className="mb-10" />

        <div className="w-full">
          <OrganizerBlock org={testOrganizer} />
        </div>
      </main>
    </div>
  );
}
