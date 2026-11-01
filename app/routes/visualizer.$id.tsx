import {useLocation, useNavigate, useOutletContext, useParams} from "react-router";
import {useEffect, useRef, useState} from "react";
import {generate3DView} from "../../components/lib/ai.action";
import {Box, Download, RefreshCcw, Share2, X} from "lucide-react";
import {Button} from "../../components/ui/button";
import {createProject, getProjectById} from "../../components/lib/puter.action";
import {ReactCompareSlider, ReactCompareSliderImage} from "react-compare-slider";

const VisualizerId = () => {
    const { id } = useParams()
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useOutletContext<AuthContext>()

    const hasInitialGenerated = useRef(false)

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const handleBack = () => navigate('/');

    const handleExport = async () => {
        if (!currentImage) return;

        try {
            const response = await fetch(currentImage);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project?.name || `Residence${id}`}-render.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
        }
    };

    const runGeneration = async (item: DesignItem) => {
        if (!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            const result = await generate3DView({ sourceImage : item.sourceImage })

            if (result.renderedImage) {
                setCurrentImage(result.renderedImage)

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderPath,
                    timestamp: item.timestamp ?? Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,

                }

                const saved = await createProject( { item: updatedItem, visibility:"private"}  )

                if (saved) {
                    setProject(saved)
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            }
        } catch (e) {
            console.error('Generation Failed: ',e)
        } finally {
            setIsProcessing(false)
        }
    }

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            const result = await getProjectById({ id });

            if (!isMounted) return;

            if (!result.success && 'error' in result) {
                // Request failure — show error, do not use fallback
                setLoadError('Failed to load project. Please try again later.');
                setIsProjectLoading(false);
                return;
            }

            if (result.success) {
                // Project found — use it directly
                setProject(result.project);
                setCurrentImage(result.project.renderedImage || null);
                setIsProjectLoading(false);
                hasInitialGenerated.current = false;
                return;
            }

            // Confirmed missing project — use location.state fallback only when initialImage is available
            if ('notFound' in result && (location.state as any)?.initialImage) {
                const resolvedProject: DesignItem = {
                    id,
                    name: (location.state as any)?.name || `Residence ${id}`,
                    sourceImage: (location.state as any)?.initialImage,
                    renderedImage: (location.state as any)?.initialRendered || null,
                    timestamp: Date.now(),
                    ownerId: userId ?? null,
                    isPublic: false,
                };
                setProject(resolvedProject);
                setCurrentImage(resolvedProject.renderedImage || null);
                setIsProjectLoading(false);
                hasInitialGenerated.current = false;
                return;
            }

            // Project not found and no fallback available — show error
            setLoadError('Project not found.');
            setIsProjectLoading(false);
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        )
            return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    if (loadError) {
        return (
            <div className="visualizer">
                <nav className={"topbar"}>
                    <div className={"brand"}>
                        <Box className={"logo"}/>
                        <span className={"name"}>Roomify</span>
                    </div>
                    <Button variant="ghost" size={"sm"} className={"exit"} onClick={handleBack}>
                        <X className={"icon"}/> exit Editor
                    </Button>
                </nav>
                <section className={"content"}>
                    <div className={"panel"}>
                        <div className={"render-placeholder"} style={{textAlign: 'center', padding: '2rem'}}>
                            <p style={{color: 'red'}}>{loadError}</p>
                            <Button onClick={handleBack}>Go Back</Button>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    return (
            <div className="visualizer">
                <nav className={"topbar"}>
                    <div className={"brand"}>
                        <Box className={"logo"}/>

                        <span className={"name"}>Roomify</span>
                    </div>
                    <Button variant="ghost" size={"sm"} className={"exit"} onClick={handleBack}>
                        <X className={"icon"}/> exit Editor
                    </Button>
                </nav>

                <section className={"content"}>
                    <div className={"panel"}>
                        <div className={"panel-header"}>
                            <div className={"panel-meta"}>
                                <p>Project</p>
                                <h2>{project?.name || `Residence${id}`}</h2>
                                <p className={"note"}>Created by you</p>
                            </div>
                            <div className={"panel-actions"}>
                                <Button
                                    size={"sm"}
                                    onClick = {handleExport}
                                    className={"export"}
                                    disabled = {!currentImage}
                                >
                                    <Download className={"w-4 h-4 mr-2"} /> Export
                                </Button>
                                <Button className={"share"} onClick={() => {}} size={"sm"}>
                                    <Share2 className={"w-4 h-4 mr-2"} />
                                    Share
                                </Button>
                            </div>
                        </div>


                        <div className={`render-area ${isProcessing ? 'is-processing' : ''}`}>
                            {currentImage ? (
                                <img src={currentImage} alt="AI Render" className={"render-img"}/>
                            ) : (
                                <div className={"render-placeholder"}>
                                    {project?.sourceImage && (
                                        <img src={project?.sourceImage} alt="Original"
                                        className={"render-fallback"} />
                                    )}

                                </div>
                            )}

                            {isProcessing && (
                                <div className={"render-overlay"}>
                                    <div className={"rendering-card"}>
                                        <RefreshCcw className={"spinner"} />
                                        <span className={"title"}>Rendering...</span>
                                        <span className={"subtitle"}>Generating your visualization</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={"panel compare"}>
                        <div className={"panel-header"}>
                            <div className={"panel-meta"}>
                                <p>Comparison</p>
                                <h3>Before and After</h3>
                            </div>
                            <div className={"hint"}>
                                Drag to compare
                            </div>
                        </div>
                        <div className={"compare-stage"}>
                            {project?.sourceImage && currentImage ? (
                                <ReactCompareSlider
                                    defaultValue={50}
                                    style={{width: "100%", height: "auto"}}
                                    itemOne={
                                    <ReactCompareSliderImage src={project?.sourceImage} alt="Before" className={"compare-img"} />
                                    }
                                    itemTwo={
                                    <ReactCompareSliderImage src={currentImage} alt="after" className={"compare-img"} />
                                    }

                                />
                            ) : (
                                <div className="compare-fallback">
                                    {project?.sourceImage && (
                                        <img src={project?.sourceImage} alt="Before" className={"compare-img"} />
                                    )};
                                </div>
                                )};
                        </div>
                    </div>
                </section>
            </div>
    )
}
export default VisualizerId