//============================================================================//
//  main.c  ------------------------------------------------------------------//
//                                                                            //
//        Description:    A program to calculate the most                     //
//                        probable state in the 6 vertex                      //
//                        model given a set of detailed                       //
//                        balance condition weights.                          //
//                                                                            //
//        TODO:           Add features                                        //
//                                                                            //
//____________________________________________________________________________//
//============================================================================//

//==============================================================================
//  Includes / Defines           // = // = // = // = // = // = // = // = // = //
//==============================================================================

#include <stdio.h>                              // standard input/output
#include <string.h>                             // string handling
#include <stdlib.h>                             // standard libraries
#include <time.h>                               // time lib for srand()
#include <cpdflib.h>                            // pdf lib



#define NAMELEN     80                          // filename max length
#define MAXROWS     1000                        // max number of matrix rows
#define MAXCOLS     1000                        // max number of matrix columns

#define PRINT_TEXT      "text"                  // text output directory
#define PRINT_PDF       "pdf"                   // pdf output directory
#define PRINT_CDENSITY  "c-density"             // c-density output directory
#define PRINT_CDENSITYPDF  "c-density-pdf"      // c-density output directory

#define VERTICES    "./v1/"                     // vertex pictures directory

#define DEBUG        0                          // enable debug mode (set to 1)
#define VOLUME       1                          // enable volume determination
#define CDENSITY     1                          // enable C vertex density plots
#define CDENSITYPDF  1                          // enable C vertex density plots
#define TEXT         1                          // enable text output
#define MATHEMATICA  0                          // enable Mathematica output
                                                //   (don't enable at same time
                                                //   as TEXT)
#define PDF          1                          // enable PDF output
#define TOTALWEIGHT  1                          // enable total weight output
#define SUCCESSRATE  1                          // enable success rate output
                                                
#define STICKY       0                          // make the vertices "stick" together
                                                // and not violate heights


//==============================================================================
//  Structures                   // = // = // = // = // = // = // = // = // = //
//==============================================================================

typedef struct mstruct mstruct;                 // matrix structure:
struct mstruct {
    int     type;                               // holds each position's type
    int     height;                             // holds each position's height
};

//==============================================================================
//  Globals                      // = // = // = // = // = // = // = // = // = //
//==============================================================================

mstruct matrix[MAXROWS][MAXCOLS];               // make the global matrix
mstruct matrix2[MAXROWS][MAXCOLS];              // make the global matrix 2
double  wts[6], rho = 0;                        // weight for vertex types & rho
int     nrows, ncols, canflip = 0;              // matrix/list trackers
int     flipchoicerow, flipchoicecol;           // flip choice trackers
int     vcanfliphigh1,vcanfliplow1;             // flip choice direction trackers
int     vcanfliphigh2,vcanfliplow2;             // flip choice direction trackers
int     matrixvol, matrixvol2;                  // volume ints for the matrices
int     xshift, yshift, dshift, base;           // for weight ratio
int     down1, down2, up1, up2;                 // row adjusts for executeflip
int     right1, right2, left1, left2;           // col adjsuts for executeflip
int     cpos1, cpos2, cpos3, cpos4;
int     rpos1, rpos2, rpos3, rpos4;
int     LOW = 0, HIGH = 1;                      // set low and high
int     pprint = 0, tprint = 0, cprint = 0;     // counters for printing
int     steps = 0;                              // number of steps
long long   flipcompleted = 0, flipfailed = 0;  // counters for success/failure
int     flipstodo;                              // total number of flips to do
double  vertexWidthHeight;                      // vertex size for pdf
time_t  globalmatrixtimestart;                  // timers for the entire 
time_t  globalmatrixtimeend;                    //  calculation process
clock_t globalmatrixclockstart;                 // CPU clocks for the entire
clock_t globalmatrixclockend;                   //  calculation process

#if SUCCESSRATE
time_t  firsttime, secondtime;                  // timers for success rates
#endif

#if CDENSITY
int     cdensitystep = 0;                       // density printout step size
#endif

//==============================================================================
//  Function Prototypes          // = // = // = // = // = // = // = // = // = //
//==============================================================================

int nltrim(char s[]);
    // trims a newline character of a string if it exists
#if TEXT
void print_text(void);
void print_text2(void);
    // prints a mathematica .txt output of the matrix
#endif
#if PDF
void print_pdf(void);
void print_pdf2(void);
    // prints a pdf output of the matrix
#endif
#if VOLUME
void print_volume(void);
void print_volume2(void);
    // prints a matrix volume file
#endif
#if CDENSITY
void print_cdensity(void);
void print_cdensity2(void);
    // prints a C vertex density plot
#endif
#if CDENSITYPDF
void print_cdensitypdf(void);
void print_cdensitypdf2(void);
    // prints a C vertex density plot in pdf
#endif
#if TOTALWEIGHT
void print_totalweight(void);
void print_totalweight2(void);
    // prints a total weight determination function
#endif
void parse(FILE *data);
    // fills the global matrix with info from file *data
void parse2(FILE *data);
    // fills the global matrix 2 with info from file *data
int setheights(void);
    // sets the height of each vertex in the first matrix
    // returns the total height (volume) of the first matrix
int setheights2(void);
    // same thing for the second matrix
double getweightratio(int *rpos, int *cpos, int *type);
    // returns the weight ratio of a point [rpos][cpos]
    // uses type to check for high/low flip and uses
    // corresponding points in the matrix
double getweightratio2(int *rpos, int *cpos, int *type);
    // same thing for the second matrix
double definerho(void);
    //defines rho using various tests.
int getflippablepositionrow(void);
    // returns a random int between 0 and nrows
int getflippablepositioncol(void);
    // returns a random int between 0 and ncols
int getisflippable(int *rpos, int *cpos, int *type);
    // checks if position [rpos][cpos] can be flipped
    // with type type
int getisflippable2(int *rpos, int *cpos, int *type);
    // same thing for the second matrix
int executeflip(int *rpos, int *cpos, int *type);
    // executes a flip at position [rpos][cpos]
    // with a type of flip corresponding to type
int executeflip2(int *rpos, int *cpos, int *type);
    // same thing for the second matrix
void updatepositions(int *rpos, int *cpos, int *type);
    // update the 4 positions on the matrix for a flip
void updatepositions2(int *rpos, int *cpos, int *type);
    // same thing for the second matrix


//==============================================================================
//  Main                         // = // = // = // = // = // = // = // = // = //
//==============================================================================

int main(int argc, char **argv) {
    
    #if SUCCESSRATE
    long long   printatsuccessrate = 50000;     // first printout (success)
    #endif
    #if TEXT
    long long   printattext = 50000;            // first printout (text)
    #endif
    #if PDF
    long long   printatpdf = 50000;             // first printout (pdf)
    #endif
    #if VOLUME
    long long   printatvolume = 50000;          // first printout (volume)
    #endif
    #if TOTALWEIGHT
    long long   printattotalweight = 50000;     // first printout (weight)
    #endif
    #if CDENSITY
    long long   printatcdensity = 50000;        // first printout (density)
    #endif
    #if SUCCESSRATE
    int     successrateinterval;                // success printout interval
    #endif
    #if TEXT
    int     textinterval;                       // code printout interval
    #endif
    #if PDF
    int     pdfinterval;                        // pdf printout interval
    #endif
    #if VOLUME
    int     volumeinterval;                     // volume printout interval
    #endif
    #if TOTALWEIGHT
    int     totalweightinterval;                // weight printout interval
    #endif
    #if CDENSITY
    int     cdensityinterval;                   // density printout interval
    #endif
    double  random;                             // random real used for tests
    double  flipchance, flipchance2;            // chance of flip occuring,
                                                //   based on weight
    
    FILE    *data;                              // file pointer
    FILE    *data2;                             // file pointer2
    
    FILE    *endfile;                           // file for end output
    char    endname[512];                       // filename for end output
    
    char    filename[NAMELEN];                  // file name
    char    filename2[NAMELEN];                 // file name2

    char    makeoutput[300];                    // output directory
    
    srand((unsigned)time(NULL));                // seed the random generator

    //------------------------------------------------------------------//
    //  Check for command line vars                                     //
    //------------------------------------------------------------------//
    if(argc > 1 ) {
    
    //set all the variables from the command line
    char *filename = argv[1];
    char *filename2 = argv[2];
    
    nrows = atoi(argv[3]);
    ncols = atoi(argv[4]);
    
    wts[0] = atof(argv[5]);
    wts[1] = atof(argv[6]);
    wts[2] = atof(argv[7]);
    wts[3] = atof(argv[8]);
    wts[4] = atof(argv[9]);
    wts[5] = atof(argv[10]);
    
    #if SUCCESSRATE
    successrateinterval = atoi(argv[11]);
    #endif
    
    #if TEXT
    textinterval = atoi(argv[11]);
    #endif
    
    #if PDF
    pdfinterval = atoi(argv[11]);
    #endif
    
    #if VOLUME
    volumeinterval = atoi(argv[11]);
    #endif
    
    #if TOTALWEIGHT
    totalweightinterval = atoi(argv[11]);
    #endif
    
    #if CDENSITY
    cdensityinterval = atoi(argv[11]);
    cdensitystep = atoi(argv[12]);
    #endif
    
    flipstodo = atof(argv[13]);
       
   
    nltrim(filename);
    nltrim(filename2);
    
    // open the file from command line
    if((data = fopen(filename,"r"))==NULL) {
        printf("*** error opening file\n");
        return 0;
    }
    if((data2 = fopen(filename2,"r"))==NULL) {
        printf("*** error opening file2\n");
        return 0;
    }
    
    
    printf("\n\nBeginning to Process Matrix:\n\n");
    
    #if STICKY
    printf("Matrices will not violate height parameters (\"sticking\" is enabled)\n");
    #endif
    
    
    printf("Weights:\n");
    printf("a1 = %lf, a2 = %lf\nb1 = %lf, b2 = %lf\nc1 = %lf, c2 = %lf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5]);
    
    printf("\n\nCompletion Information:\n");
    printf("Total flips to complete: %d\n",flipstodo);
    
    printf("\n\nInterval Information:\n");
#if CDENSITY
    printf("Output intervals set to: %d flips\n",cdensityinterval);
    printf("C-density grid size:     %dx%d\n",cdensitystep,cdensitystep);
#endif
    
    } else {

    //------------------------------------------------------------------//
    //  File setup                                                      //
    //------------------------------------------------------------------//

    printf("enter name of file: ");
    
    // input name
    if(fgets(filename,NAMELEN,stdin)==NULL) {
        printf("*** error reading filename\n");
        return 0;
    } nltrim(filename);
    
    // open file
    if((data = fopen(filename,"r"))==NULL) {
        printf("*** error opening file\n");
        return 0;
    }
    
    printf("enter name of file 2: ");
    
    // input name
    if(fgets(filename2,NAMELEN,stdin)==NULL) {
        printf("*** error reading filename2\n");
        return 0;
    } nltrim(filename2);
    
    // open file
    if((data2 = fopen(filename2,"r"))==NULL) {
        printf("*** error opening file2\n");
        return 0;
    }
    
    //------------------------------------------------------------------//
    //  Matrix setup                                                    //
    //------------------------------------------------------------------//
    
    // input size
    printf("number of matrix rows: ");
     scanf("%d",&nrows);
    printf("number of matrix cols: ");
     scanf("%d",&ncols);
    
    
    
    //------------------------------------------------------------------//
    //  Weight setup                                                    //
    //------------------------------------------------------------------//

    // get weights
    printf("weight for a1: ");
     scanf("%lf",&wts[0]);
    printf("weight for a2: ");
     scanf("%lf",&wts[1]);
    printf("weight for b1: ");
     scanf("%lf",&wts[2]);
    printf("weight for b2: ");
     scanf("%lf",&wts[3]);
    printf("weight for c1: ");
     scanf("%lf",&wts[4]);
    printf("weight for c2: ");
     scanf("%lf",&wts[5]);
     
     
    //------------------------------------------------------------------//
    //  Output settings                                                 //
    //------------------------------------------------------------------//
    
    // output settings:

#if SUCCESSRATE
     printf("interval to output success rate:      ");
     scanf("%d",&successrateinterval);
#endif
#if PDF
     printf("interval to output PDF preview:       ");
     scanf("%d",&pdfinterval);
#endif
#if TEXT
     printf("interval to output .matrix file:      ");
     scanf("%d",&textinterval);
#endif
#if VOLUME
     printf("interval to output volume file:       ");
     scanf("%d",&volumeinterval);
#endif
#if TOTALWEIGHT
     printf("interval to output total weight file: ");
     scanf("%d",&totalweightinterval);
#endif
#if CDENSITY
     printf("interval to output density file:      ");
     scanf("%d",&cdensityinterval);
     printf("step size for density plot (even integer): ");
     scanf("%d",&cdensitystep);
#endif

     printf("total flips to do:                    ");
     scanf("%d",&flipstodo);

}
     //------------------------------------------------------------------//
     //  Directory setup                                                 //
     //------------------------------------------------------------------//

    printf("Ensuring output directories are created...\n");     
     // primary output directory for this matrix
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows);
     system(makeoutput);

#if PDF
     // pdf output
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_PDF);
     system(makeoutput);
    sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_PDF);
     system(makeoutput);
#endif

#if TEXT
     // text output
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_TEXT);
     system(makeoutput);
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_TEXT);
     system(makeoutput);
#endif

#if CDENSITY
     // c-density output
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITY);
     system(makeoutput);
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITY);
     system(makeoutput);
    
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITYPDF);
     system(makeoutput);
     sprintf(makeoutput,"mkdir \"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2\"",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITYPDF);
     system(makeoutput);
#endif


    //------------------------------------------------------------------//
    //  Initialization                                                  //
    //------------------------------------------------------------------//
     
    // fill the matrices
    parse(data);
    parse2(data2);
     
    // set up rho (weight multiplier)
    definerho();
    
    // set the heights on each vertex to begin
    matrixvol = setheights();
    matrixvol2 = setheights2();
    
    
    // initialize the global timers
    globalmatrixtimestart = time(NULL);
    globalmatrixclockstart = clock();
    
    //------------------------------------------------------------------//
    //  Main Loop                                                       //
    //------------------------------------------------------------------//
        
//while(flipcompleted <= flipstodo) { 
//while(((double) (matrixvol-matrixvol2)*100/matrixvol)>1) { //volume delta is greater than 1%, proceed 
while(1==1) {
        random = (double) rand()/RAND_MAX;

        // proceed with the actual flipping
        
        // get a random position
        getflippablepositionrow();
        getflippablepositioncol();           
        
        
        // makes tests to check if a high flip, low flip, 
        // or bi flip should be executed
        vcanfliphigh1 = getisflippable(&flipchoicerow,&flipchoicecol,&HIGH);
        vcanfliplow1 = getisflippable(&flipchoicerow,&flipchoicecol,&LOW);
        

    //------------------------------------------------------------------//
    //  Handle the output functions                                     //
    //------------------------------------------------------------------//        
        
#if SUCCESSRATE
        if(flipcompleted > printatsuccessrate-1){
        printf("Success rate of flips: %Lf%% | Executing %lf flips/second\n",((long double) flipcompleted*100) / (flipfailed + flipcompleted),((double)successrateinterval) / (secondtime-firsttime));
        printf("Volume delta = %d | %lf%% | %lf%%\n",matrixvol-matrixvol2,((double) (matrixvol-matrixvol2)*100/matrixvol),((double) (matrixvol-matrixvol2)*100/matrixvol2));
        firsttime = secondtime;
        secondtime = time(NULL);
        printatsuccessrate+=(long long)successrateinterval;
        }
#endif

#if TEXT
        if(flipcompleted > printattext){
        printattext+=(long long)textinterval;
        print_text();
        print_text2();
        }
#endif

#if PDF
        if(flipcompleted > printatpdf + 1){
        printatpdf+=(long long)pdfinterval;
        print_pdf();
        print_pdf2();
        }
#endif

#if VOLUME
        if(flipcompleted > printatvolume + 2){
            printatvolume+=(long long)volumeinterval;
            print_volume();
            print_volume2();
        }
#endif

#if TOTALWEIGHT
        if(flipcompleted > printattotalweight + 3){
            printattotalweight+=(long long)totalweightinterval;
            print_totalweight();
            print_totalweight2();
        }
#endif
        
#if CDENSITY
        if(flipcompleted > printatcdensity + 4){
            printatcdensity+=(long long)cdensityinterval;
            print_cdensity();
            print_cdensity2();
#if CDENSITYPDF
            print_cdensitypdf();
            print_cdensitypdf2();
#endif
        }
#endif


        
    //------------------------------------------------------------------//
    //  Handle the matrices                                             //
    //------------------------------------------------------------------//

        // handle the first matrix (the higher of the two)

        if(vcanfliphigh1==1 && vcanfliplow1==0) {
            // possibly execute a high flip
            
            flipchance=getweightratio(&flipchoicerow,&flipchoicecol,&HIGH);
            random = (double) rand()/RAND_MAX;
            
            #if DEBUG
            printf("random: %lf, canflip/nsqr: %lf\n",random,flipchance);
            #endif
            
            if(flipchance>=random) {
                
                // proceed with the high flip
                #if DEBUG
                printf("doing a high flip \n");
                #endif
                
                flipcompleted++;
                executeflip(&flipchoicerow,&flipchoicecol,&HIGH);
            } else {
                flipfailed++;
            } 
            
        } else if(vcanfliphigh1==0 && vcanfliplow1==1) {
            // possibly execute a low flip
            
            flipchance=getweightratio(&flipchoicerow,&flipchoicecol,&LOW);
            random = (double) rand()/RAND_MAX;
            
            #if DEBUG
            printf("random: %lf, canflip/nsqr: %lf\n",random,flipchance);
            #endif
            
            if(flipchance>=random) {
                // proceed with the low flip
                
                #if DEBUG
                printf("doing a low flip \n");
                #endif
                
                executeflip(&flipchoicerow,&flipchoicecol,&LOW);
                flipcompleted++;
            } else {
                flipfailed++;
            }
            
        } else if(vcanfliphigh1==1 && vcanfliplow1==1) {
            
            //possibly execute a biflip
            flipchance = getweightratio(&flipchoicerow,&flipchoicecol,&HIGH);
            flipchance2 = getweightratio(&flipchoicerow,&flipchoicecol,&LOW);
            random = (double) rand()/RAND_MAX;
            
            #if DEBUG
            printf("random: %lf, canflip/nsqr: %lf, %lf\n",random,flipchance,flipchance2);
            #endif
            
            if(flipchance>=random) {
                
                // proceed to a high flip
                #if DEBUG
                printf("doing a high bi flip \n");  
                #endif
                
                executeflip(&flipchoicerow,&flipchoicecol,&HIGH);
                flipcompleted++;
            } else if(flipchance+flipchance2>=random) {
                
                // proceed to a low flip
                #if DEBUG
                printf("doing a low bi flip \n");
                #endif
                
                executeflip(&flipchoicerow,&flipchoicecol,&LOW);
                flipcompleted++;
            }  else {
                flipfailed++;
            } 
            
        } // end dealing with the first matrix


    //------------------------------------------------------------------//
    //  Handle the second matrix                                        //
    //------------------------------------------------------------------//

        // after the first matrix is done, check the second (lower)
        
        // must recalculate these to ensure the matrices don't 
        // pass each other before sticking together
        vcanfliphigh2 = getisflippable2(&flipchoicerow,&flipchoicecol,&HIGH);
        vcanfliplow2 = getisflippable2(&flipchoicerow,&flipchoicecol,&LOW);
        
        if(vcanfliphigh2==1 && vcanfliplow2==0) {
            // possibly execute a high flip
            
            flipchance=getweightratio2(&flipchoicerow,&flipchoicecol,&HIGH);
            random = (double) rand()/RAND_MAX;
            
            #if DEBUG
            printf("random: %lf, canflip/nsqr: %lf\n",random,flipchance);
            #endif
            
            if(flipchance>=random) {
                
                // proceed with the high flip
                #if DEBUG
                printf("doing a high flip \n");
                #endif 
                
                flipcompleted++;
                executeflip2(&flipchoicerow,&flipchoicecol,&HIGH);
            } else {
                flipfailed++;
            } 
            
        } else if(vcanfliphigh2==0 && vcanfliplow2==1) {
            // possibly execute a low flip
            
            flipchance=getweightratio2(&flipchoicerow,&flipchoicecol,&LOW);
            random = (double) rand()/RAND_MAX;
            
            #if DEBUG
            printf("random: %lf, canflip/nsqr: %lf\n",random,flipchance);
            #endif
            
            if(flipchance>=random) {
                // proceed with the low flip
                
                #if DEBUG
                printf("doing a low flip \n");
                #endif
                
                executeflip2(&flipchoicerow,&flipchoicecol,&LOW);
                flipcompleted++;
            } else {
                flipfailed++;
            }
            
        } else if(vcanfliphigh2==1 && vcanfliplow2==1) {
            
            //possibly execute a biflip
            flipchance = getweightratio2(&flipchoicerow,&flipchoicecol,&HIGH);
            flipchance2 = getweightratio2(&flipchoicerow,&flipchoicecol,&LOW);
            random = (double) rand()/RAND_MAX;
            
            #if DEBUG
            printf("random: %lf, canflip/nsqr: %lf, %lf\n",random,flipchance,flipchance2);
            #endif
            
            if(flipchance>=random) {
                
                // proceed to a high flip
                #if DEBUG
                printf("doing a high bi flip \n");  
                #endif
                
                executeflip2(&flipchoicerow,&flipchoicecol,&HIGH);
                flipcompleted++;
            } else if(flipchance+flipchance2>=random) {
                
                // proceed to a low flip
                #if DEBUG
                printf("doing a low bi flip \n");
                #endif
                
                executeflip2(&flipchoicerow,&flipchoicecol,&LOW);
                flipcompleted++;
            }  else {
                flipfailed++;
            } 
            
        } // end dealing with the second matrix
        
    


    // restart loop    
}

    //------------------------------------------------------------------//
    //  Handle the final output                                         //
    //------------------------------------------------------------------//


    // set the finishing time
    globalmatrixtimeend = time(NULL);
    globalmatrixclockend = clock();
    
#if TEXT
    print_text();
    print_text2();
#endif

#if PDF
    print_pdf();
    print_pdf2();
#endif

#if VOLUME
    print_volume();
    print_volume2();
#endif

#if TOTALWEIGHT
    print_totalweight();
    print_totalweight2();
#endif

#if CDENSITY
    print_cdensity();
    print_cdensity2();
#if CDENSITYPDF
    print_cdensitypdf();
    print_cdensitypdf2();
#endif
#endif
    
    // print out the final stats on the matrix
    
    printf("\n\nEnd statistics:\n\n");
    
    printf("Weights:\n");
    printf("a1 = %lf, a2 = %lf\nb1 = %lf, b2 = %lf\nc1 = %lf, c2 = %lf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5]);

    printf("\n\nSize: %dx%d",nrows,ncols);
    
    printf("\n\nAlgorithmic Efficiency:\n");
    printf("Total flips completed: %lld\n",flipcompleted);
    printf("Total flips failed:    %lld\n",flipfailed);
    printf("Overall algorithm acceptance rate: %Lf%%", ((long double) flipcompleted * 100) / (flipfailed + flipcompleted));
    
    printf("\n\nTimers:\n");
    printf("Total time spent in computation (non-cpu): %lf seconds\n",((double) globalmatrixtimeend-globalmatrixtimestart));
    printf("Total time spent in computation (cpu):     %lf seconds\n",((double) (globalmatrixclockend - globalmatrixclockstart)) / (CLOCKS_PER_SEC));
    printf("Total flips per second (non-cpu):          %Lf flips/second\n", ((long double) flipcompleted) / (globalmatrixtimeend - globalmatrixtimestart));
    printf("Total flips per second (cpu):              %Lf flips/second\n\n", ((long double) flipcompleted) / ((globalmatrixclockend - globalmatrixclockstart) / (CLOCKS_PER_SEC)));      
    
    
    
    // print the output file
    
    sprintf(endname,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/matrix.end",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows);    
    endfile = fopen(endname,"a");

    fprintf(endfile, "\n\nEnd statistics:\n\n");
    
    fprintf(endfile, "Weights:\n");
    fprintf(endfile, "a1 = %lf, a2 = %lf\nb1 = %lf, b2 = %lf\nc1 = %lf, c2 = %lf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5]);
    
    fprintf(endfile, "\n\nSize: %dx%d",nrows,ncols);
        
    fprintf(endfile, "\n\nAlgorithmic Efficiency:\n");
    fprintf(endfile, "Total flips completed: %lld\n",flipcompleted);
    fprintf(endfile, "Total flips failed:    %lld\n",flipfailed);
    fprintf(endfile, "Overall algorithm acceptance rate: %Lf%%", ((long double) flipcompleted * 100) / (flipfailed + flipcompleted));
    
    fprintf(endfile, "\n\nTimers:\n");
    fprintf(endfile, "Total time spent in computation (non-cpu): %lf seconds\n",((double) globalmatrixtimeend-globalmatrixtimestart));
    fprintf(endfile, "Total time spent in computation (cpu):     %lf seconds\n",((double) (globalmatrixclockend - globalmatrixclockstart)) / (CLOCKS_PER_SEC));
    fprintf(endfile, "Total flips per second (non-cpu):          %Lf flips/second\n", ((long double) flipcompleted) / (globalmatrixtimeend - globalmatrixtimestart));
    fprintf(endfile, "Total flips per second (cpu):              %Lf flips/second\n\n", ((long double) flipcompleted) / ((globalmatrixclockend - globalmatrixclockstart) / (CLOCKS_PER_SEC)));      
    
    fclose(endfile);

    return 0;
}

//==============================================================================
//  Function Definitions         // = // = // = // = // = // = // = // = // = //
//==============================================================================

int nltrim(char s[]) {
    
    int len;
    len = (int)strlen(s);
    if(len==0) return 0;
    if(s[len-1]=='\n') {
        s[len-1] = '\0';
        return 1;
    }
    return 0;
}


#if TEXT
//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================
void print_text(void) {
    printf("Flips completed: %lld - Matrix file  written\n",flipcompleted);

    int i,j;
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s/output%d.matrix",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_TEXT,tprint);    
    data = fopen(name,"w");

	for(i=0;i<nrows;i++) {
		for(j=0;j<ncols;j++) {
			switch(matrix[i][j].type) {
				case 0:
					fprintf(data, "0");
					break;
				case 1:
					fprintf(data, "1");
					break;
				case 2:
					fprintf(data, "2");
					break;
				case 3:
					fprintf(data, "3");
					break;
				case 4:
					fprintf(data, "4");
					break;
				case 5:
					fprintf(data, "5");
					break;
			}
		}
	}	
	fclose(data);
    tprint++;
    if(tprint>20) tprint=0;
    
}

void print_text2(void) {
    printf("Flips completed: %lld - Matrix2 file  written\n",flipcompleted);

    int i,j;
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2/output%d.matrix",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_TEXT,tprint);    
    data = fopen(name,"w");

	for(i=0;i<nrows;i++) {
		for(j=0;j<ncols;j++) {
			switch(matrix2[i][j].type) {
				case 0:
					fprintf(data, "0");
					break;
				case 1:
					fprintf(data, "1");
					break;
				case 2:
					fprintf(data, "2");
					break;
				case 3:
					fprintf(data, "3");
					break;
				case 4:
					fprintf(data, "4");
					break;
				case 5:
					fprintf(data, "5");
					break;
			}
		}
	}	
	fclose(data);
}
#endif


#if PDF
void draw_vertex(CPDFdoc *pdf, int vertex, double x, double y) {
    // this function should receive the upper-left corner of the vertex as the coordinates
    // vertexWidthHeight is a global defining the length and width of the vertex
    switch(vertex) {
        case 0: // a11
			cpdf_setlinewidth(pdf, 2);
            cpdf_newpath(pdf); // | top line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), y);
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // | top line
            
            cpdf_newpath(pdf); // | bottom line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight)));
            cpdf_stroke(pdf); // | bottom line
            
            cpdf_newpath(pdf); // - left line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, x, (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - left line
            
            cpdf_newpath(pdf); // - right line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - right line
            break;
        case 1: // a22
			cpdf_setlinewidth(pdf, 1);
            cpdf_newpath(pdf); // | top line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), y);
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // | top line
            
            cpdf_newpath(pdf); // | bottom line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight)));
            cpdf_stroke(pdf); // | bottom line
            
			cpdf_newpath(pdf); // - left line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, x, (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - left line
            
            cpdf_newpath(pdf); // - right line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - right line
            break;
        case 2: // a33
			cpdf_setlinewidth(pdf, 2);
            cpdf_newpath(pdf); // | top line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), y);
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // | top line
            
            cpdf_newpath(pdf); // | bottom line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight)));
            cpdf_stroke(pdf); // | bottom line
            
			cpdf_setlinewidth(pdf, 1);
            cpdf_newpath(pdf); // - left line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, x, (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - left line
            
            cpdf_newpath(pdf); // - right line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - right line
            break;
        case 3: // b12
			cpdf_setlinewidth(pdf, 1);
            cpdf_newpath(pdf); // | top line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), y);
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // | top line
            
            cpdf_newpath(pdf); // | bottom line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight)));
            cpdf_stroke(pdf); // | bottom line
            
			cpdf_setlinewidth(pdf, 2);
            cpdf_newpath(pdf); // - left line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, x, (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - left line
            
            cpdf_newpath(pdf); // - right line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - right line
            break;
        case 4: // b13
			cpdf_setlinewidth(pdf, 1);
            cpdf_newpath(pdf); // | top line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), y);
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // | top line
            
            cpdf_setlinewidth(pdf, 2);
			cpdf_newpath(pdf); // | bottom line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight)));
            cpdf_stroke(pdf); // | bottom line
            
			cpdf_newpath(pdf); // - left line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, x, (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - left line
            
			cpdf_setlinewidth(pdf, 1);
            cpdf_newpath(pdf); // - right line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - right line
            break;
        case 5: // b21
			cpdf_setlinewidth(pdf, 2);
            cpdf_newpath(pdf); // | top line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), y);
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // | top line
            
			cpdf_setlinewidth(pdf, 1);
            cpdf_newpath(pdf); // | bottom line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight)));
            cpdf_stroke(pdf); // | bottom line
            
            cpdf_newpath(pdf); // - left line
            cpdf_setrgbcolor(pdf, .8, .8, .8); //rgb color for stroke
            cpdf_moveto(pdf, x, (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - left line
            
            cpdf_setlinewidth(pdf, 2);
			cpdf_newpath(pdf); // - right line
            cpdf_setrgbcolor(pdf, 0, 0, 0); //rgb color for stroke
            cpdf_moveto(pdf, (x + ((double)vertexWidthHeight / 2)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_lineto(pdf, (x + ((double)vertexWidthHeight)), (y - ((double)vertexWidthHeight / 2)));
            cpdf_stroke(pdf); // - right line
            break;
    }
}
#endif 

#if PDF
//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

void print_pdf(void) {
    printf("Flips completed: %lld - PDF preview written\n",flipcompleted);
    
    CPDFdoc *pdf;
    int i, j;
    double x, y;
    x = ((double) 18 / 72);
    y = ((double) ((nrows * 6) + 18) / 72);
    //start it at the border.
    vertexWidthHeight = ((double) 6 / 72);
    // 6 point width/height vertices
    
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s/output%d.pdf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_PDF,pprint);    
    
    char pdfOutputSize[512];
    sprintf(pdfOutputSize,"0 0 %d %d",(36 + (ncols * 6)),(36 + (nrows * 6)));
    // this allows for a quarter inch border (18 points)
    // and 9 point (1/8") width vertices
    
    pdf = cpdf_open(0, NULL);
    cpdf_enableCompression(pdf, YES);		/* use Flate/Zlib compression */
    cpdf_init(pdf);
    cpdf_pageInit(pdf, 1, PORTRAIT, pdfOutputSize, pdfOutputSize);		/* page orientation */
    
    cpdf_setlinewidth(pdf, 1.5);
    //linewidth = 1.5 points (1.5/72 inch)
    
    for(i=0;i<nrows;i++) {
        for(j=0;j<ncols;j++) {
            draw_vertex(pdf, matrix[i][j].type, x, y) ;
            x += vertexWidthHeight;
		}
        x = ((double) 18 / 72);
        y = y - vertexWidthHeight;
    }
    
    cpdf_finalizeAll(pdf);			/* PDF file/memstream is actually written here */
    cpdf_savePDFmemoryStreamToFile(pdf, name);
    
    cpdf_close(pdf);
    
    pprint++;
    if(pprint>20) pprint=0;
  }

void print_pdf2(void) {
    printf("Flips completed: %lld - PDF preview 2 written\n",flipcompleted);
    
    CPDFdoc *pdf;
    int i, j;
    double x, y;
    x = ((double) 18 / 72);
    y = ((double) ((nrows * 6) + 18) / 72);
    //start it at the border.
    vertexWidthHeight = ((double) 6 / 72);
    // 9 point width/height vertices
    
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2/output%d.pdf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_PDF,pprint);    
    
    char pdfOutputSize[512];
    sprintf(pdfOutputSize,"0 0 %d %d",(36 + (ncols * 6)),(36 + (nrows * 6)));
    // this allows for a quarter inch border (18 points)
    // and 9 point (1/8") width vertices
    
    pdf = cpdf_open(0, NULL);
    cpdf_enableCompression(pdf, YES);		/* use Flate/Zlib compression */
    cpdf_init(pdf);
    cpdf_pageInit(pdf, 1, PORTRAIT, pdfOutputSize, pdfOutputSize);		/* page orientation */
    
    cpdf_setlinewidth(pdf, 1.5);
    //linewidth = 1.5 points (1.5/72 inch)
    
    for(i=0;i<nrows;i++) {
        for(j=0;j<ncols;j++) {
            draw_vertex(pdf, matrix2[i][j].type, x, y) ;
            x += vertexWidthHeight;
		}
        x = ((double) 18 / 72);
        y = y - vertexWidthHeight;
    }
    
    cpdf_finalizeAll(pdf);			/* PDF file/memstream is actually written here */
    cpdf_savePDFmemoryStreamToFile(pdf, name);
    
    cpdf_close(pdf);
    
}
#endif

#if CDENSITYPDF
//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

void print_cdensitypdf(void) {
    printf("Flips completed: %lld - PDF cdensity written\n",flipcompleted);
    
    CPDFdoc *pdf;
    int currentdensity;
    double currentdensitydouble;
    int i, j, k, l;
    double x, y;
    x = ((double) 18 / 72);
    y = ((double) ((nrows * 2) + 18) / 72);
    //start it at the border.
    double rectWidth = ((double) 2 / 72);
    // 9 point width/height vertices
    
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s/output%d.pdf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITYPDF,cprint);    
    char pdfOutputSize[512];
    sprintf(pdfOutputSize,"0 0 %d %d",(36 + (ncols * 2)),(36 + (nrows * 2)));
    // this allows for a quarter inch border (18 points)
    
    pdf = cpdf_open(0, NULL);
    cpdf_enableCompression(pdf, YES);		/* use Flate/Zlib compression */
    cpdf_init(pdf);
    cpdf_pageInit(pdf, 1, PORTRAIT, pdfOutputSize, pdfOutputSize);		/* page orientation */
    
    cpdf_setlinewidth(pdf, 2);
    //linewidth = 2 points (2/72 inch)
    
    for(i=(cdensitystep/2);i<(nrows-(cdensitystep/2));i++) {
		for(j=(cdensitystep/2);j<(ncols-(cdensitystep/2));j++) {
            currentdensity = 0;	
            for(k=0-(cdensitystep/2);k<(cdensitystep/2)+1;k++) {
                for(l=0-(cdensitystep/2);l<(cdensitystep/2)+1;l++) {
                    // count +1 for c vertices
                    if(matrix[i+k][j+l].type == 4 || 
                       matrix[i+k][j+l].type == 5) {
                        currentdensity++;
                    }
                }
            }
            // print relative density for the point to the file
            currentdensitydouble = ((double)currentdensity/((cdensitystep+1)*(cdensitystep+1)));
            
            cpdf_newpath(pdf);
            //cpdf_setrgbcolor(pdf, (float) currentdensitydouble, (float) currentdensitydouble, (float) currentdensitydouble);
            cpdf_setgray(pdf, (float) currentdensitydouble);
            cpdf_rect(pdf, x, y, rectWidth, rectWidth);
            cpdf_fill(pdf);
            
            
            x += rectWidth;
        }
        x = ((double) 18 / 72);
        y = y - rectWidth;
    }
    
    cpdf_finalizeAll(pdf);			/* PDF file/memstream is actually written here */
    cpdf_savePDFmemoryStreamToFile(pdf, name);
    
    cpdf_close(pdf);
    
}

void print_cdensitypdf2(void) {
    printf("Flips completed: %lld - PDF cdensity 2 written\n",flipcompleted);
    
    CPDFdoc *pdf;
    int currentdensity;
    double currentdensitydouble;
    int i, j, k, l;
    double x, y;
    x = ((double) 18 / 72);
    y = ((double) ((nrows * 2) + 18) / 72);
    //start it at the border.
    double rectWidth = ((double) 2 / 72);
    // 9 point width/height vertices
    
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2/output%d.pdf",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITYPDF,cprint);    
    char pdfOutputSize[512];
    sprintf(pdfOutputSize,"0 0 %d %d",(36 + (ncols * 2)),(36 + (nrows * 2)));
    // this allows for a quarter inch border (18 points)
    
    pdf = cpdf_open(0, NULL);
    cpdf_enableCompression(pdf, YES);		/* use Flate/Zlib compression */
    cpdf_init(pdf);
    cpdf_pageInit(pdf, 1, PORTRAIT, pdfOutputSize, pdfOutputSize);		/* page orientation */
    
    cpdf_setlinewidth(pdf, 2);
    //linewidth = 2 points (2/72 inch)
    
    for(i=(cdensitystep/2);i<(nrows-(cdensitystep/2));i++) {
		for(j=(cdensitystep/2);j<(ncols-(cdensitystep/2));j++) {
            currentdensity = 0;	
            for(k=0-(cdensitystep/2);k<(cdensitystep/2)+1;k++) {
                for(l=0-(cdensitystep/2);l<(cdensitystep/2)+1;l++) {
                    // count +1 for c vertices
                    if(matrix2[i+k][j+l].type == 4 || 
                       matrix2[i+k][j+l].type == 5) {
                        currentdensity++;
                    }
                }
            }
            // print relative density for the point to the file
            currentdensitydouble = ((double)currentdensity/((cdensitystep+1)*(cdensitystep+1)));
            
            cpdf_newpath(pdf);
            //cpdf_setrgbcolor(pdf, (float) currentdensitydouble, (float) currentdensitydouble, (float) currentdensitydouble);
            cpdf_setgray(pdf, (float) currentdensitydouble);
            cpdf_rect(pdf, x, y, rectWidth, rectWidth);
            cpdf_fill(pdf);
            
            
            x += rectWidth;
        }
        x = ((double) 18 / 72);
        y = y - rectWidth;
    }
    
    cpdf_finalizeAll(pdf);			/* PDF file/memstream is actually written here */
    cpdf_savePDFmemoryStreamToFile(pdf, name);
    
    cpdf_close(pdf);
    
}
#endif



#if VOLUME
//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================
void print_volume(void) {

    printf("Flips completed: %lld - volume file  written \n",flipcompleted);
    
    int current = 0;
    int total = 0;
    int i, j;
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/matrix.volume",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows);    
    data = fopen(name,"a");

	for(i=0;i<nrows;i++) {
        current = 0;
		for(j=0;j<ncols;j++) {
			if(matrix[i][j].type == 0 || matrix[i][j].type == 2 || matrix[i][j].type == 5) {
                current++;
            }
                total = total+current;
		}
		
	}	
    fprintf(data, "%d\n",total);
	fclose(data);

    
}

void print_volume2(void) {

    printf("Flips completed: %lld - volume 2 file  written \n",flipcompleted);
    
    int current = 0;
    int total = 0;
    int i, j;
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/matrix2.volume",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows);    
    data = fopen(name,"a");

	for(i=0;i<nrows;i++) {
        current = 0;
		for(j=0;j<ncols;j++) {
			if(matrix2[i][j].type == 0 || matrix2[i][j].type == 2 || matrix2[i][j].type == 5) {
                current++;
            }
                total = total+current;
		}
		
	}	
    fprintf(data, "%d\n",total);
	fclose(data);

    
}
#endif


#if TOTALWEIGHT
//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================
void print_totalweight(void) {

    printf("Flips completed: %lld - total weight file  written \n",flipcompleted);
    
    int numa1 = 0, numa2 = 0, numb1 = 0, numb2 = 0, numc1 = 0, numc2 = 0;
    int i,j;
    
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/matrix.totalweight",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows);
    data = fopen(name,"a");

	for(i=0;i<nrows;i++) {
        for(j=0;j<ncols;j++) {
        switch(matrix[i][j].type) {
                case 0:
                    numa1++;
                    break;
                case 1:
                    numa2++;
                    break;
                case 2:
                    numb1++;
                    break;
                case 3:
                    numb2++;
                    break;
                case 4:
                    numc1++;
                    break;
                case 5:
                    numc2++;
                    break;
            }
        }
	}	
    fprintf(data, "%lf^%d * %lf^%d * %lf^%d * %lf^%d * %lf^%d * %lf^%d\n",wts[0],numa1,wts[1],numa2,wts[2],numb1,wts[3],numb2,wts[4],numc1,wts[5],numc2);
	fclose(data);
}

void print_totalweight2(void) {

    printf("Flips completed: %lld - total weight file 2 written \n",flipcompleted);
    
    int numa1 = 0, numa2 = 0, numb1 = 0, numb2 = 0, numc1 = 0, numc2 = 0;
    int i,j;
    
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/matrix2.totalweight",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows);
    data = fopen(name,"a");

	for(i=0;i<nrows;i++) {
        for(j=0;j<ncols;j++) {
        switch(matrix2[i][j].type) {
                case 0:
                    numa1++;
                    break;
                case 1:
                    numa2++;
                    break;
                case 2:
                    numb1++;
                    break;
                case 3:
                    numb2++;
                    break;
                case 4:
                    numc1++;
                    break;
                case 5:
                    numc2++;
                    break;
            }
        }
	}	
    fprintf(data, "%lf^%d * %lf^%d * %lf^%d * %lf^%d * %lf^%d * %lf^%d\n",wts[0],numa1,wts[1],numa2,wts[2],numb1,wts[3],numb2,wts[4],numc1,wts[5],numc2);
	fclose(data);

    
}
#endif


#if CDENSITY
//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================
void print_cdensity(void) {
    printf("Flips completed: %lld - density file  written\n",flipcompleted);
    
    double currentdensity = 0;
    int i, j, k, l;
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s/matrix%d.cdensity",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITY,cprint);    
    data = fopen(name,"w");
    
	for(i=(cdensitystep/2);i<(nrows-(cdensitystep/2));i++) {
		for(j=(cdensitystep/2);j<(ncols-(cdensitystep/2));j++) {
            currentdensity = 0;	
            for(k=0-(cdensitystep/2);k<(cdensitystep/2)+1;k++) {
                for(l=0-(cdensitystep/2);l<(cdensitystep/2)+1;l++) {
                    // count +1 for c vertices
                    if(matrix[i+k][j+l].type == 4 || matrix[i+k][j+l].type == 5) {
                        currentdensity++;
                    }
                }
            }
            // print relative density for the point to the file
            fprintf(data, "%lf,",(currentdensity/((cdensitystep+1)*(cdensitystep+1))));
            
        }
        
    }
    
    fclose(data);
    cprint++;
    if(cprint>50) cprint=0;
}

void print_cdensity2(void) {
    printf("Flips completed: %lld - density file 2 written\n",flipcompleted);
    
    double currentdensity = 0;
    int i, j, k, l;
    FILE *data;
    char name[512];
    sprintf(name,"./output/a1=%lf, a2=%lf, b1=%lf, b2=%lf, c1=%lf, c2=%lf, %dx%d/%s2/matrix%d.cdensity",wts[0],wts[1],wts[2],wts[3],wts[4],wts[5],ncols,nrows,PRINT_CDENSITY,cprint);    
    data = fopen(name,"w");
    
	for(i=(cdensitystep/2);i<(nrows-(cdensitystep/2));i++) {
		for(j=(cdensitystep/2);j<(ncols-(cdensitystep/2));j++) {
            currentdensity = 0;	
            for(k=0-(cdensitystep/2);k<(cdensitystep/2)+1;k++) {
                for(l=0-(cdensitystep/2);l<(cdensitystep/2)+1;l++) {
                    // count +1 for c vertices
                    if(matrix2[i+k][j+l].type == 4 || matrix2[i+k][j+l].type == 5) {
                        currentdensity++;
                    }
                }
            }
            // print relative density for the point to the file
            fprintf(data, "%lf,",(currentdensity/((cdensitystep+1)*(cdensitystep+1))));
            
        }
        
    }
    
    fclose(data);
}
#endif


//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

void parse(FILE *data) {
    
    int i,j;
    for(i=0;i<nrows;i++) {
        for(j=0;j<ncols;j++) {
            matrix[i][j].type = (int)fgetc(data)-(int)'0';
        }
    }
    fclose(data);
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

void parse2(FILE *data) {
    
    int i,j;
    for(i=0;i<nrows;i++) {
        for(j=0;j<ncols;j++) {
            matrix2[i][j].type = (int)fgetc(data)-(int)'0';
        }
    }
    fclose(data);
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================
int setheights(void) {
    
    int current = 0;
    int total = 0;
    int i, j;
    
	for(i=0;i<nrows;i++) {
        current = 0;
		for(j=0;j<ncols;j++) {
			if(matrix[i][j].type == 0 || matrix[i][j].type == 2 || matrix[i][j].type == 5) {
                current++;
            }
            matrix[i][j].height = current; // set the height value
            total = total+current;  // keep a current total
            #if DEBUG
            printf("%d",current);
            #endif
		}
        #if DEBUG
        printf("\n");
        #endif
	}	
    
    return(total);
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================
int setheights2(void) {
    
    int current = 0;
    int total = 0;
    int i, j;
    
	for(i=0;i<nrows;i++) {
        current = 0;
		for(j=0;j<ncols;j++) {
			if(matrix2[i][j].type == 0 || matrix2[i][j].type == 2 || matrix2[i][j].type == 5) {
                current++;
            }
            matrix2[i][j].height = current; // set the height value
            total = total+current;  // keep a current total
            #if DEBUG
            printf("%d",current);
            #endif
		}
        #if DEBUG
        printf("\n");
        #endif
	}	
    
    return(total);
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

double getweightratio(int *rpos, int *cpos, int *type) {
    
    xshift = matrix[*rpos][*cpos-1+(2**type)].type;
    yshift = matrix[*rpos+1-(2**type)][*cpos].type;
    dshift = matrix[*rpos+1-(2**type)][*cpos-1+(2**type)].type;
    base = matrix[*rpos][*cpos].type;
    
    // define new values
    if(*type) {  
        
        // If vertex was a1, it will be c1; if it was c2, it will be a2
        if(base == 0) base = 4;
        if(base == 5) base = 1;
        
        // If vertex was a2, it will be c1; if it was c2, it will be a1
        if(dshift == 1) dshift = 4;
        if(dshift == 5) dshift = 0;
        
        // If vertex was b2, it will be c2; if it was c1, it will be b1 
        if(xshift == 3) xshift = 5;
        if(xshift == 4) xshift = 2;
        
        // If vertex was b1, it will be c2; if it was c1, it will be b2
        if(yshift == 2) yshift = 5;
        if(yshift == 4) yshift = 3;
        
    } else {
        
        // If vertex was c1, it will be a2; if it was a1, it will be c2
        if(base == 4) base = 1;
        if(base == 0) base = 5;
        
        // If vertex was c1, it will be a1; if it was a2, it will be c2
        if(dshift == 4) dshift = 0;
        if(dshift == 1) dshift = 5;
        
        // If vertex was c2, it will be b1; if it was b2, it will be c1 
        if(xshift == 5) xshift = 2;
        if(xshift == 3) xshift = 4;
        
        // If vertex was c2, it will be b2; if it was b1, it will be c1 
        if(yshift == 5) yshift = 3;
        if(yshift == 2) yshift = 4;
        
    }
    
    #if DEBUG
        printf("\n%lf \n \n",   wts[base] * wts[xshift] *
                    wts[yshift] * wts[dshift] / rho);
    #endif
    
    return (wts[base] * wts[xshift] *
            wts[yshift] * wts[dshift] / rho);
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

double getweightratio2(int *rpos, int *cpos, int *type) {
    
    xshift = matrix2[*rpos][*cpos-1+(2**type)].type;
    yshift = matrix2[*rpos+1-(2**type)][*cpos].type;
    dshift = matrix2[*rpos+1-(2**type)][*cpos-1+(2**type)].type;
    base = matrix2[*rpos][*cpos].type;
    
    // define new values
    if(*type) {  
        
        // If vertex was a1, it will be c1; if it was c2, it will be a2
        if(base == 0) base = 4;
        if(base == 5) base = 1;
        
        // If vertex was a2, it will be c1; if it was c2, it will be a1
        if(dshift == 1) dshift = 4;
        if(dshift == 5) dshift = 0;
        
        // If vertex was b2, it will be c2; if it was c1, it will be b1 
        if(xshift == 3) xshift = 5;
        if(xshift == 4) xshift = 2;
        
        // If vertex was b1, it will be c2; if it was c1, it will be b2
        if(yshift == 2) yshift = 5;
        if(yshift == 4) yshift = 3;
        
    } else {
        
        // If vertex was c1, it will be a2; if it was a1, it will be c2
        if(base == 4) base = 1;
        if(base == 0) base = 5;
        
        // If vertex was c1, it will be a1; if it was a2, it will be c2
        if(dshift == 4) dshift = 0;
        if(dshift == 1) dshift = 5;
        
        // If vertex was c2, it will be b1; if it was b2, it will be c1 
        if(xshift == 5) xshift = 2;
        if(xshift == 3) xshift = 4;
        
        // If vertex was c2, it will be b2; if it was b1, it will be c1 
        if(yshift == 5) yshift = 3;
        if(yshift == 2) yshift = 4;
        
    }
    
    #if DEBUG
        printf("\n%lf \n \n",   wts[base] * wts[xshift] *
                    wts[yshift] * wts[dshift] / rho);
    #endif
    
    return (wts[base] * wts[xshift] *
            wts[yshift] * wts[dshift] / rho);
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

int getflippablepositionrow(void) {
    //random between 0 and nrows-1
    flipchoicerow = ((int) nrows * ((double) (rand()/(RAND_MAX + 1.0))));


    return 0;
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

int getflippablepositioncol(void) {
    //random between 0 and ncols-1
    flipchoicecol = ((int) ncols * ((double) (rand()/(RAND_MAX + 1.0))));


    return 0;
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

int getisflippable(int *rpos, int *cpos, int *type) {
    
	//printf("getisflippable called - row: %d col: %d type: %d\n",*rpos,*cpos,*type);
	if(*rpos < 0 || *rpos >= nrows) return 0;
	if(*cpos < 0 || *cpos >= ncols) return 0;
	
    if(*type) {
        if(*rpos>0 && *cpos<(ncols-1)) { //check high bounds
            #if STICKY
            if(matrix[*rpos][*cpos].height>matrix2[*rpos][*cpos].height) { //check the height
            #endif
                if(matrix[*rpos][*cpos].type==0 || matrix[*rpos][*cpos].type==5) { //check position contents
                    if(matrix[*rpos-1][*cpos+1].type==1 || 
                       matrix[*rpos-1][*cpos+1].type==5) { // check upper right free
                        //printf("    returned true\n");
                        return 1;
                    }
                #if STICKY
                }
                #endif
            }
        }
    } else {
        if(*rpos<(nrows-1) && *cpos>0) { //check low bounds
            if(matrix[*rpos][*cpos].type==0 || matrix[*rpos][*cpos].type==4) { //check position contents
                if(matrix[*rpos+1][*cpos-1].type==1 || 
                   matrix[*rpos+1][*cpos-1].type==4) { // check lower left free
                    //printf("    returned true\n");
                    return 1;
                }
            }    
        }
    }
	//printf("    returned false\n");
    return 0;
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

int getisflippable2(int *rpos, int *cpos, int *type) {
    
	//printf("getisflippable called - row: %d col: %d type: %d\n",*rpos,*cpos,*type);
	if(*rpos < 0 || *rpos >= nrows) return 0;
	if(*cpos < 0 || *cpos >= ncols) return 0;
    
    
	
    if(*type) {
        if(*rpos>0 && *cpos<(ncols-1)) { //check high bounds
            
            if(matrix2[*rpos][*cpos].type==0 || matrix2[*rpos][*cpos].type==5) { //check position contents
                if(matrix2[*rpos-1][*cpos+1].type==1 || 
                   matrix2[*rpos-1][*cpos+1].type==5) { // check upper right free
                    //printf("    returned true\n");
                    return 1;
                }
                
            }
        }
    } else {
        if(*rpos<(nrows-1) && *cpos>0) { //check low bounds
            #if STICKY
            if(matrix2[*rpos][*cpos].height<matrix[*rpos][*cpos].height) { //check the height
            #endif
                if(matrix2[*rpos][*cpos].type==0 || matrix2[*rpos][*cpos].type==4) { //check position contents
                    if(matrix2[*rpos+1][*cpos-1].type==1 || 
                       matrix2[*rpos+1][*cpos-1].type==4) { // check lower left free
                        //printf("    returned true\n");
                        return 1;
                    }
                #if STICKY
                }
                #endif
            }
        }    
    }
	//printf("    returned false\n");
    return 0;
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

int executeflip(int *rpos, int *cpos, int *type) {
    updatepositions(rpos,cpos,type);

    //increase or decrease the height
    if(*type) {
    matrix[*rpos][*cpos].height--;
    matrixvol--;
    } else {
    matrix[*rpos+1][*cpos-1].height++;      //add one to lower left
    matrixvol++;
    }
    // return no error
    return 0;
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

int executeflip2(int *rpos, int *cpos, int *type) {
    updatepositions2(rpos,cpos,type);

    //increase or decrease the height
    if(*type) {
    matrix2[*rpos][*cpos].height--;
    matrixvol2--;
    } else {
    matrix2[*rpos+1][*cpos-1].height++;    //add one to lower left
    matrixvol2++;
    }
    // return no error
    return 0;
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

void updatepositions(int *rpos, int *cpos, int *type) {
    
	#if DEBUG
        printf("updatepositions called - row: %d col: %d type: %d\n",*rpos,*cpos,*type);
    #endif
    
    if(*type) {
        // base: If vertex was a1, it will be c1; if it was c2, it will be a2
        #if DEBUG
            printf("base position is %d\n",matrix[*rpos][*cpos].type);
        #endif
        
        if(matrix[*rpos][*cpos].type == 0) {
            #if DEBUG
                printf("Updating base position on up flip1\n");
            #endif
            
            matrix[*rpos][*cpos].type = 4;
        }
        if(matrix[*rpos][*cpos].type == 5) {
            #if DEBUG
                printf("Updating base position on up flip1\n");
            #endif
            
            matrix[*rpos][*cpos].type = 1;
        }
        
        //up right: If vertex was a2, it will be c1; if it was c2, it will be a1
        if(matrix[*rpos-1][*cpos+1].type == 1) {
            #if DEBUG
                printf("Updating up right position on up flip2\n");
            #endif
            
            matrix[*rpos-1][*cpos+1].type =  4;
        }
        if(matrix[*rpos-1][*cpos+1].type == 5) {
            #if DEBUG
                printf("Updating up right position on up flip2\n");
            #endif
            
            matrix[*rpos-1][*cpos+1].type =  0;
        }
        
        // right: If vertex was b2, it will be c2; if it was c1, it will be b1 
        if(matrix[*rpos][*cpos+1].type == 3) {
            #if DEBUG
                printf("Updating right position on up flip3\n");
            #endif
            
            matrix[*rpos][*cpos+1].type =  5;
        }
        if(matrix[*rpos][*cpos+1].type == 4) {
            #if DEBUG
                printf("Updating right position on up flip3\n");
            #endif
            
            matrix[*rpos][*cpos+1].type =  2;
        }
        
        // up: If vertex was b1, it will be c2; if it was c1, it will be b2
        if(matrix[*rpos-1][*cpos].type == 2){
            #if DEBUG
                printf("Updating up position on up flip4\n");
            #endif
            
            matrix[*rpos-1][*cpos].type =  5;
        }
        if(matrix[*rpos-1][*cpos].type == 4){
            #if DEBUG
                printf("Updating up position on up flip4\n");
            #endif
            
            matrix[*rpos-1][*cpos].type =  3;
        }
        
    } else {
        
        // base: If vertex was c1, it will be a2; if it was a1, it will be c2
        #if DEBUG
            printf("base position is %d\n",matrix[*rpos][*cpos].type);
        #endif
        
        if(matrix[*rpos][*cpos].type == 4){
            #if DEBUG
                printf("Updating base position on down flip1\n");
            #endif
            
            matrix[*rpos][*cpos].type = 1;
        }
        if(matrix[*rpos][*cpos].type == 0) {
            #if DEBUG
                printf("Updating base position on down flip1\n");
            #endif
            
            matrix[*rpos][*cpos].type = 5;
        }
        
        // down left: If vertex was c1, it will be a1; if it was a2, it will be c2
        if(matrix[*rpos+1][*cpos-1].type == 4) {
            #if DEBUG
                printf("Updating down left position on down flip2\n");
            #endif
            
            matrix[*rpos+1][*cpos-1].type =  0;}
        
        if(matrix[*rpos+1][*cpos-1].type == 1) {
            #if DEBUG
                printf("Updating down left position on down flip2\n");
            #endif
            
            matrix[*rpos+1][*cpos-1].type =  5;
        }
        
        // left: If vertex was c2, it will be b1; if it was b2, it will be c1 
        if(matrix[*rpos][*cpos-1].type == 5) {
            #if DEBUG
                printf("Updating left position on down flip3\n");
            #endif
            
            matrix[*rpos][*cpos-1].type =  2;
        }
        if(matrix[*rpos][*cpos-1].type == 3) {
            #if DEBUG
                printf("Updating left position on down flip3\n");
            #endif
            
            matrix[*rpos][*cpos-1].type =  4;
        }
        
        // down: If vertex was c2, it will be b2; if it was b1, it will be c1 
        if(matrix[*rpos+1][*cpos].type == 5) {
            #if DEBUG
                printf("Updating down position on down flip4\n");
            #endif
            
            matrix[*rpos+1][*cpos].type =  3;
        }
        if(matrix[*rpos+1][*cpos].type == 2) {
            #if DEBUG
                printf("Updating down position on down flip4\n");
            #endif
            
            matrix[*rpos+1][*cpos].type =  4;
        }
    }
}

//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

void updatepositions2(int *rpos, int *cpos, int *type) {
    
	#if DEBUG
        printf("updatepositions2 called - row: %d col: %d type: %d\n",*rpos,*cpos,*type);
    #endif
    
    if(*type) {
        // base: If vertex was a1, it will be c1; if it was c2, it will be a2
        #if DEBUG
            printf("base position is %d\n",matrix2[*rpos][*cpos].type);
        #endif
        
        if(matrix2[*rpos][*cpos].type == 0) {
            #if DEBUG
                printf("Updating base position on up flip1\n");
            #endif
            
            matrix2[*rpos][*cpos].type = 4;
        }
        if(matrix2[*rpos][*cpos].type == 5) {
            #if DEBUG
                printf("Updating base position on up flip1\n");
            #endif
            
            matrix2[*rpos][*cpos].type = 1;
        }
        
        //up right: If vertex was a2, it will be c1; if it was c2, it will be a1
        if(matrix2[*rpos-1][*cpos+1].type == 1) {
            #if DEBUG
                printf("Updating up right position on up flip2\n");
            #endif
            
            matrix2[*rpos-1][*cpos+1].type =  4;
        }
        if(matrix2[*rpos-1][*cpos+1].type == 5) {
            #if DEBUG
                printf("Updating up right position on up flip2\n");
            #endif
            
            matrix2[*rpos-1][*cpos+1].type =  0;
        }
        
        // right: If vertex was b2, it will be c2; if it was c1, it will be b1 
        if(matrix2[*rpos][*cpos+1].type == 3) {
            #if DEBUG
                printf("Updating right position on up flip3\n");
            #endif
            
            matrix2[*rpos][*cpos+1].type =  5;
        }
        if(matrix2[*rpos][*cpos+1].type == 4) {
            #if DEBUG
                printf("Updating right position on up flip3\n");
            #endif
            
            matrix2[*rpos][*cpos+1].type =  2;
        }
        
        // up: If vertex was b1, it will be c2; if it was c1, it will be b2
        if(matrix2[*rpos-1][*cpos].type == 2){
            #if DEBUG
                printf("Updating up position on up flip4\n");
            #endif
            
            matrix2[*rpos-1][*cpos].type =  5;
        }
        if(matrix2[*rpos-1][*cpos].type == 4){
            #if DEBUG
                printf("Updating up position on up flip4\n");
            #endif
            
            matrix2[*rpos-1][*cpos].type =  3;
        }
        
    } else {
        
        // base: If vertex was c1, it will be a2; if it was a1, it will be c2
        #if DEBUG
            printf("base position is %d\n",matrix2[*rpos][*cpos].type);
        #endif
        
        if(matrix2[*rpos][*cpos].type == 4){
            #if DEBUG
                printf("Updating base position on down flip1\n");
            #endif
            
            matrix2[*rpos][*cpos].type = 1;
        }
        if(matrix2[*rpos][*cpos].type == 0) {
            #if DEBUG
                printf("Updating base position on down flip1\n");
            #endif
            
            matrix2[*rpos][*cpos].type = 5;
        }
        
        // down left: If vertex was c1, it will be a1; if it was a2, it will be c2
        if(matrix2[*rpos+1][*cpos-1].type == 4) {
            #if DEBUG
                printf("Updating down left position on down flip2\n");
            #endif
            
            matrix2[*rpos+1][*cpos-1].type =  0;}
        
        if(matrix2[*rpos+1][*cpos-1].type == 1) {
            #if DEBUG
                printf("Updating down left position on down flip2\n");
            #endif
            
            matrix2[*rpos+1][*cpos-1].type =  5;
        }
        
        // left: If vertex was c2, it will be b1; if it was b2, it will be c1 
        if(matrix2[*rpos][*cpos-1].type == 5) {
            #if DEBUG
                printf("Updating left position on down flip3\n");
            #endif
            
            matrix2[*rpos][*cpos-1].type =  2;
        }
        if(matrix2[*rpos][*cpos-1].type == 3) {
            #if DEBUG
                printf("Updating left position on down flip3\n");
            #endif
            
            matrix2[*rpos][*cpos-1].type =  4;
        }
        
        // down: If vertex was c2, it will be b2; if it was b1, it will be c1 
        if(matrix2[*rpos+1][*cpos].type == 5) {
            #if DEBUG
                printf("Updating down position on down flip4\n");
            #endif
            
            matrix2[*rpos+1][*cpos].type =  3;
        }
        if(matrix2[*rpos+1][*cpos].type == 2) {
            #if DEBUG
                printf("Updating down position on down flip4\n");
            #endif
            
            matrix2[*rpos+1][*cpos].type =  4;
        }
    }
}


//==============================================================================
////////////////////////////////////********////////////////////////////////////
//==============================================================================

double definerho(void) {
    
    // down normal flip possibilities 
    if(rho<(wts[1]*wts[4]*wts[5]*wts[4])) rho = wts[1]*wts[4]*wts[5]*wts[4];
    if(rho<(wts[1]*wts[4]*wts[5]*wts[3])) rho = wts[1]*wts[4]*wts[5]*wts[3];
    if(rho<(wts[1]*wts[4]*wts[0]*wts[4])) rho = wts[1]*wts[4]*wts[0]*wts[4];
    if(rho<(wts[1]*wts[4]*wts[0]*wts[3])) rho = wts[1]*wts[4]*wts[0]*wts[3];
    if(rho<(wts[1]*wts[2]*wts[5]*wts[4])) rho = wts[1]*wts[2]*wts[5]*wts[4];
    if(rho<(wts[1]*wts[2]*wts[5]*wts[3])) rho = wts[1]*wts[2]*wts[5]*wts[3];
    if(rho<(wts[1]*wts[2]*wts[0]*wts[4])) rho = wts[1]*wts[2]*wts[0]*wts[4];
    if(rho<(wts[1]*wts[2]*wts[0]*wts[3])) rho = wts[1]*wts[2]*wts[0]*wts[3];
    
    // up normal flip possibilities
    if(rho<(wts[1]*wts[3]*wts[4]*wts[5])) rho = wts[1]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[1]*wts[3]*wts[4]*wts[2])) rho = wts[1]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[1]*wts[3]*wts[0]*wts[5])) rho = wts[1]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[1]*wts[3]*wts[0]*wts[2])) rho = wts[1]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[1]*wts[5]*wts[4]*wts[5])) rho = wts[1]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[1]*wts[5]*wts[4]*wts[2])) rho = wts[1]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[1]*wts[5]*wts[0]*wts[5])) rho = wts[1]*wts[5]*wts[0]*wts[5];
    if(rho<(wts[1]*wts[5]*wts[0]*wts[2])) rho = wts[1]*wts[5]*wts[0]*wts[2];
    
    // biflip possibilities 
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5]))
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 2
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2]))
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[4]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 3
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 4
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[4]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 5
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 6
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[2]*wts[5]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 7
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[4] + wts[4]*wts[5]*wts[1]*wts[2];
    
    // 8
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[3]*wts[0]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[4]*wts[2];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[5];
    if(rho<(wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2])) 
      rho = wts[5]*wts[2]*wts[0]*wts[3] + wts[4]*wts[5]*wts[1]*wts[2];
    
    #if DEBUG
        printf("rho: %lf",rho);
    #endif
    
    return rho;
}

