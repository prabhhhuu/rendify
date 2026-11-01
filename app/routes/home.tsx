import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import {ArrowRight, ArrowUpRight, Clock, Layers} from "lucide-react";
import {Button} from "../../components/ui/button";
import Upload from "../../components/Upload";
import {Link, useNavigate} from "react-router";
import {useEffect, useRef, useState} from "react";
import {createProject, getProjects} from "../../components/lib/puter.action";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
    const navigate = useNavigate();
    const [project,setProject] = useState<DesignItem[]>([]);
    const isCreatingProjectRef = useRef(false);

    const handleUploadComplete = async (base64Data: string) => {
        if(isCreatingProjectRef.current) return false;
        isCreatingProjectRef.current = true;

        try {
        const newId = Date.now().toString();
        const name =`Residence ${newId}`;

        const newItem = {
            id: newId, name, sourceImage:base64Data,
            renderedImage: undefined,
            timestamp: Date.now()

        }

        const saved = await createProject({ item: newItem, visibility: 'private' });
        if(!saved) {
            console.log("Failed to create project");
            return false;
        }
        setProject((prev) => [saved, ...prev])

        navigate(`/visualizer/${newId}`,{
            state: {
                initialImage: saved.sourceImage,
                initialRendered: saved.renderedImage,
                name
            }
        })
        return true;
        } finally {
            isCreatingProjectRef.current = false;
        }
    }

    useEffect(() => {
        const fetchProjects = async () => {
            const items = await getProjects();

            setProject(items);
        }

        fetchProjects();
    }, []);

  return (
      <div className="home">
          <Navbar />
        <section className={"hero"}>
            <div className={"announce"}>
                <div className={"dot"}>
                    <div className={"pulse"}></div>
                </div>
                <p>Introducing Roomify 2.0</p>
            </div>

            <h1>Build Beautiful spaces at the speed of thought with roomify</h1>

            <div className={"subtitle"}>
                Roomify is an AI-first design environment that helps you visualize, render, and ship architectural projects faster than ever.
            </div>

            <div className={"actions"}>
                <a href="#upload" className={"cta"}>
                    Start Building <ArrowRight className={"icon"} />
                </a>
                <Button variant="outline" size="lg" className={"demo"}>Watch Demo</Button>
            </div>

            <div id="upload" className={"upload-shell"}>
                <div className={"grid-overlay"}/>
                <div className={"upload-card"}>
                    <div className={"upload-head"}>
                        <div className={"upload-icon"}>
                            <Layers className={"icon"}/>
                        </div>

                        <h3>Upload your floor Plan</h3>
                        <p>Supports JPG, PNG formats up to 10MB</p>
                    </div>

                        <Upload onComplete={handleUploadComplete} />
                </div>
            </div>
        </section>

          <section className={"projects"}>
              <div className={"section-inner"}>
                  <div className={"section-head"}>
                      <div className={"copy"}>
                          <h2>Projects</h2>
                          <p>Your Latest work and shared community projects, all in one place.</p>
                      </div>
                  </div>

                  <div className={"projects-grid"}>
                      {project.map(({ id, name , renderedImage, sourceImage, timestamp }) => (
                      <Link key={id} to={`/visualizer/${id}`} className={"project-card group"}>
                          <div className={"preview"}>
                              <img src={renderedImage || sourceImage}
                                alt="project"
                              />

                              <div className={"badge"}>
                                  <span>Community</span>
                              </div>
                          </div>
                          <div className={"card-body"}>
                              <div>
                                  <h3>{name}</h3>

                                  <div className={"meta"}>
                                      <Clock size={12}/>
                                      <span>{new Date(timestamp).toLocaleString()}</span>
                                      <span>Edward Kernel</span>
                                  </div>
                              </div>
                              <div className={"arrow"}>
                                  <ArrowUpRight size={18} />
                              </div>
                          </div>
                      </Link>

                      ))}
                  </div>
              </div>
          </section>
      </div>
  );
}
